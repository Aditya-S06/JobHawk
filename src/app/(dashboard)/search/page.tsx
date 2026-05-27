"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  ExternalLink,
  Loader2,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApiResult, JobListing, JobSearchResponse, TrackedJob } from "@/types";
import {
  fromJobListing,
  loadTracked,
  mergeSyncedJob,
  writeTracked,
} from "@/lib/saved-jobs";
import { syncJobToNotionApi } from "@/lib/notion-sync-client";

type WorkFilter = "all" | "remote" | "hybrid";
type SortKey = "relevance" | "recency";

interface SearchCache {
  query: string;
  location: string;
  filter: WorkFilter;
  sort: SortKey;
  results: JobListing[];
  nextPageToken: string | null;
  pagesLoaded: number;
}

const SEARCH_CACHE_KEY = "jobhawk:search-cache";
const MAX_SEARCH_PAGES = 3;

function mergeJobResults(prev: JobListing[], next: JobListing[]): JobListing[] {
  const seen = new Set(prev.map((j) => j.id));
  const unique = next.filter((j) => !seen.has(j.id));
  return [...prev, ...unique];
}

function buildSearchUrl(
  q: string,
  location: string,
  nextPageToken?: string | null,
): string {
  const params = new URLSearchParams({
    q,
    location,
  });
  if (nextPageToken) {
    params.set("next_page_token", nextPageToken);
  }
  return `/api/jobs/search?${params.toString()}`;
}

function isRemote(job: JobListing): boolean {
  return /\bremote\b/i.test(job.location) || /\bremote\b/i.test(job.description);
}

function isHybrid(job: JobListing): boolean {
  return /\bhybrid\b/i.test(job.location) || /\bhybrid\b/i.test(job.description);
}

export default function SearchPage() {
  const [query, setQuery] = useState("Software Engineering Intern");
  const [location, setLocation] = useState("San Jose, California, United States");
  const [results, setResults] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<WorkFilter>("all");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [saved, setSaved] = useState<TrackedJob[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(() => new Set());
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // One-shot hydration from localStorage so leaving and returning to this tab
  // does not burn a SerpApi search query.
  useEffect(() => {
    const stored = window.localStorage.getItem(SEARCH_CACHE_KEY);
    if (stored) {
      try {
        const cache = JSON.parse(stored) as SearchCache;
        // One-shot hydration from external storage on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuery(cache.query);
        setLocation(cache.location);
        setFilter(cache.filter);
        setSort(cache.sort);
        setResults(cache.results);
        setNextPageToken(cache.nextPageToken ?? null);
        setPagesLoaded(
          typeof cache.pagesLoaded === "number"
            ? cache.pagesLoaded
            : cache.results.length > 0
              ? 1
              : 0,
        );
      } catch {
        // ignore corrupt cache
      }
    }
    setSaved(loadTracked());
    setHydrated(true);
  }, []);

  // Persist whenever any meaningful piece changes, but only after hydration so
  // we don't overwrite cache with the initial-state defaults on first render.
  useEffect(() => {
    if (!hydrated) return;
    const cache: SearchCache = {
      query,
      location,
      filter,
      sort,
      results,
      nextPageToken,
      pagesLoaded,
    };
    window.localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
  }, [hydrated, query, location, filter, sort, results, nextPageToken, pagesLoaded]);

  async function fetchSearchPage(nextToken?: string | null): Promise<JobSearchResponse> {
    const res = await fetch(buildSearchUrl(query, location, nextToken));
    const json = (await res.json()) as ApiResult<JobSearchResponse>;
    if (!json.success) {
      throw new Error(json.error);
    }
    return json.data;
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setNextPageToken(null);
    setPagesLoaded(0);
    try {
      const data = await fetchSearchPage();
      setResults(data.jobs);
      setNextPageToken(data.nextPageToken);
      setPagesLoaded(data.jobs.length > 0 || data.nextPageToken ? 1 : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setResults([]);
      setNextPageToken(null);
      setPagesLoaded(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (pagesLoaded >= MAX_SEARCH_PAGES || loadingMore || results.length === 0) return;
    setLoadingMore(true);
    setError(null);
    try {
      let token = nextPageToken;
      // Cached searches from before pagination may lack a token; recover from page 1.
      if (!token) {
        const refresh = await fetchSearchPage();
        token = refresh.nextPageToken;
        setNextPageToken(token);
        if (!token) return;
      }

      const data = await fetchSearchPage(token);
      setResults((prev) => mergeJobResults(prev, data.jobs));
      setNextPageToken(data.nextPageToken);
      setPagesLoaded((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingMore(false);
    }
  }

  const canLoadMore =
    results.length > 0 && pagesLoaded < MAX_SEARCH_PAGES && !loading;
  const atPageCap = pagesLoaded >= MAX_SEARCH_PAGES && results.length > 0;
  const noMoreFromGoogle =
    pagesLoaded > 0 && !nextPageToken && !canLoadMore && !loadingMore;

  const savedIds = useMemo(() => new Set(saved.map((j) => j.id)), [saved]);

  function toggleSave(job: JobListing) {
    if (syncingIds.has(job.id)) return;

    setNotionError(null);
    const exists = saved.some((j) => j.id === job.id);
    if (exists) {
      const next = saved.filter((j) => j.id !== job.id);
      writeTracked(next);
      setSaved(next);
      return;
    }

    const added = fromJobListing(job);
    const next = [...saved, added];
    writeTracked(next);
    setSaved(next);

    if (added.notionPageId) return;

    setSyncingIds((ids) => new Set(ids).add(job.id));
    void syncJobToNotionApi(added)
      .then((synced) => {
        setSaved((current) => {
          const merged = mergeSyncedJob(current, synced);
          writeTracked(merged);
          return merged;
        });
      })
      .catch((err) => {
        setNotionError(err instanceof Error ? err.message : "Notion sync failed");
      })
      .finally(() => {
        setSyncingIds((ids) => {
          const nextIds = new Set(ids);
          nextIds.delete(job.id);
          return nextIds;
        });
      });
  }

  const filtered = useMemo(() => {
    let list = results;
    if (filter === "remote") list = list.filter(isRemote);
    if (filter === "hybrid") list = list.filter(isHybrid);
    if (sort === "recency") {
      list = [...list].sort((a, b) => (a.posted_at ?? "").localeCompare(b.posted_at ?? ""));
    }
    return list;
  }, [results, filter, sort]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Search Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Live results from Google Jobs via SerpApi. Results are cached locally
          so switching tabs won&apos;t burn a query.
        </p>
      </header>

      <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Job title or keywords"
            className="pl-9"
          />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Filter:</span>
        {(["all", "remote", "hybrid"] as const).map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-4 mr-1">Sort:</span>
        {(["relevance", "recency"] as const).map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={sort === s ? "default" : "outline"}
            onClick={() => setSort(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
          {pagesLoaded > 0 ? ` · page ${pagesLoaded} of ${MAX_SEARCH_PAGES}` : ""}
          {saved.length > 0 ? ` · ${saved.length} saved` : ""}
        </span>
        {canLoadMore && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </>
            ) : (
              `Load more (page ${pagesLoaded + 1})`
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notionError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          Notion: {notionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((job) => {
          const isSaved = savedIds.has(job.id);
          return (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {isRemote(job) && <Badge variant="secondary">Remote</Badge>}
                  {isHybrid(job) && <Badge variant="secondary">Hybrid</Badge>}
                  {job.posted_at && <Badge variant="outline">{job.posted_at}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {job.description}
                </p>
                <div className="flex gap-2 pt-1">
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ size: "sm", variant: "default" })}
                  >
                    Apply <ExternalLink className="ml-1 size-3.5" />
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant={isSaved ? "secondary" : "outline"}
                    disabled={syncingIds.has(job.id)}
                    onClick={() => toggleSave(job)}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="size-3.5" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="size-3.5" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-12">
            No jobs yet. Run a search to get started.
          </div>
        )}
      </div>

      {pagesLoaded > 0 && (atPageCap || noMoreFromGoogle) && (
        <p className="text-center text-xs text-muted-foreground pt-2">
          {atPageCap && nextPageToken
            ? `Reached the ${MAX_SEARCH_PAGES}-page limit for this search.`
            : noMoreFromGoogle
              ? "No more results from Google for this search."
              : null}
        </p>
      )}
    </div>
  );
}

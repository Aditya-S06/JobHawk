import { NextRequest, NextResponse } from "next/server";
import type { ApiResult, JobListing, JobSearchResponse } from "@/types";
import { supabaseServer } from "@/lib/supabase/server";
import { MissingKeyError, resolveUserKey } from "@/lib/user-keys";

// SerpApi Google Jobs raw shape (only fields we actually consume).
interface SerpApiApplyOption {
  link?: string;
  title?: string;
}

interface SerpApiDetectedExtensions {
  posted_at?: string;
  schedule_type?: string;
}

interface SerpApiJob {
  job_id?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  via?: string;
  apply_options?: SerpApiApplyOption[];
  extensions?: string[];
  detected_extensions?: SerpApiDetectedExtensions;
}

interface SerpApiResponse {
  jobs_results?: SerpApiJob[];
  serpapi_pagination?: {
    next_page_token?: string;
    next?: string;
  };
}

function extractNextPageToken(payload: SerpApiResponse): string | null {
  const direct = payload.serpapi_pagination?.next_page_token?.trim();
  if (direct) return direct;

  const nextUrl = payload.serpapi_pagination?.next;
  if (nextUrl) {
    try {
      const token = new URL(nextUrl).searchParams.get("next_page_token")?.trim();
      if (token) return token;
    } catch {
      // ignore malformed URL
    }
  }
  return null;
}

const DEFAULT_LOCATION = "San Jose, California, United States";

function isSponsored(job: SerpApiJob): boolean {
  const haystack = [job.via ?? "", ...(job.extensions ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes("sponsored") || haystack.includes("promoted");
}

function pickApplyUrl(job: SerpApiJob): string {
  const direct = job.apply_options?.find((o) => o.link)?.link;
  return direct ?? "";
}

function cleanJobs(raw: SerpApiJob[], location: string): JobListing[] {
  return raw
    .filter((job) => !isSponsored(job))
    .map((job, idx): JobListing => {
      const applyUrl = pickApplyUrl(job);
      return {
        id: job.job_id ?? `${job.title ?? "job"}-${idx}`,
        title: job.title ?? "Untitled role",
        company: job.company_name ?? "Unknown",
        location: job.location ?? location,
        description: job.description ?? "",
        apply_url: applyUrl,
        posted_at: job.detected_extensions?.posted_at ?? null,
      };
    })
    .filter((job) => job.apply_url.length > 0);
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResult<JobSearchResponse>>> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const apiKey = await resolveUserKey(user.id, "serpapi");

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim();
    const location = searchParams.get("location")?.trim() || DEFAULT_LOCATION;
    const nextPageToken = searchParams.get("next_page_token")?.trim();

    if (!q) {
      return NextResponse.json(
        { success: false, error: "Query param 'q' is required" },
        { status: 400 },
      );
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("q", q);
    url.searchParams.set("location", location);
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", apiKey);
    if (nextPageToken) {
      url.searchParams.set("next_page_token", nextPageToken);
    }

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `SerpApi error: ${res.status}` },
        { status: 502 },
      );
    }

    const payload = (await res.json()) as SerpApiResponse;
    const raw = payload.jobs_results ?? [];
    const jobs = cleanJobs(raw, location);
    const next = extractNextPageToken(payload);

    return NextResponse.json({
      success: true,
      data: { jobs, nextPageToken: next },
    });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

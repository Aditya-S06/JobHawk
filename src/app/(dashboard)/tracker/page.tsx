"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JobStatus, TrackedJob } from "@/types";
import {
  loadTracked,
  mergeSyncedJob,
  withStatus,
  writeTracked,
} from "@/lib/saved-jobs";
import {
  syncAllJobsToNotionApi,
  syncJobToNotionApi,
} from "@/lib/notion-sync-client";

const COLUMNS: { key: JobStatus; label: string }[] = [
  { key: "saved", label: "Saved" },
  { key: "tailoring", label: "Tailoring" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "rejected", label: "Rejected" },
];

export default function TrackerPage() {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobs(loadTracked());
  }, []);

  async function persistAndSync(
    updated: TrackedJob[],
    changed: TrackedJob,
  ): Promise<void> {
    writeTracked(updated);
    setJobs(updated);
    setSyncError(null);
    try {
      const synced = await syncJobToNotionApi(changed);
      const merged = mergeSyncedJob(updated, synced);
      writeTracked(merged);
      setJobs(merged);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Notion sync failed");
    }
  }

  function move(id: string, next: JobStatus) {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    const changed = withStatus(job, next);
    const updated = jobs.map((j) => (j.id === id ? changed : j));
    void persistAndSync(updated, changed);
  }

  function remove(id: string) {
    setJobs((prev) => {
      const updated = prev.filter((j) => j.id !== id);
      writeTracked(updated);
      return updated;
    });
  }

  async function syncAll() {
    setSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const current = loadTracked();
      if (current.length === 0) {
        setSyncMessage("No jobs to sync.");
        return;
      }
      const synced = await syncAllJobsToNotionApi(current);
      writeTracked(synced);
      setJobs(synced);
      setSyncMessage(`Synced ${synced.length} job${synced.length === 1 ? "" : "s"} to Notion.`);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Notion sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Application Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline view of your applications. Changes sync to your Notion database
            automatically.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={syncing || jobs.length === 0}
          onClick={() => void syncAll()}
        >
          {syncing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Syncing…
            </>
          ) : (
            "Sync all to Notion"
          )}
        </Button>
      </header>

      {syncError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          Notion: {syncError}
        </div>
      )}
      {syncMessage && !syncError && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          {syncMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const inCol = jobs.filter((j) => j.status === col.key);
          return (
            <Card key={col.key} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  {col.label}
                  <Badge variant="outline">{inCol.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inCol.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Empty</p>
                )}
                {inCol.map((job) => (
                  <Card key={job.id} className="p-3 bg-card space-y-2">
                    <div>
                      <div className="text-sm font-medium leading-snug">{job.title}</div>
                      <div className="text-xs text-muted-foreground">{job.company}</div>
                      {job.location && (
                        <div className="text-xs text-muted-foreground">{job.location}</div>
                      )}
                      {job.notionPageId && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Synced to Notion
                        </div>
                      )}
                    </div>

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Open posting <ExternalLink className="size-3" />
                      </a>
                    )}

                    <div className="flex flex-wrap gap-1 pt-1">
                      {COLUMNS.filter((c) => c.key !== job.status).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => move(job.id, c.key)}
                          className="text-[10px] px-1.5 py-0.5 rounded border bg-background hover:bg-accent"
                        >
                          → {c.label}
                        </button>
                      ))}
                      <button
                        onClick={() => remove(job.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded border bg-background hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1"
                        title="Remove from tracker"
                      >
                        <Trash2 className="size-3" /> Remove
                      </button>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tracked applications yet. Save a job from the Search page to get started.
        </p>
      )}
    </div>
  );
}

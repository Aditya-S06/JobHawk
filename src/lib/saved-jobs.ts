import type { ApiResult, JobListing, TrackedJob } from "@/types";
import { withStatus } from "@/lib/tracked-job-utils";

export const TRACKED_KEY = "jobhawk:tracked";
const LEGACY_TRACKED_KEYS = ["jobhawk:tracked", "vibejob:tracked"] as const;

export { withStatus };

export function fromJobListing(job: JobListing): TrackedJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.apply_url,
    status: "saved",
    description: job.description,
  };
}

/** Merge notionPageId (and appliedAt if returned) into the tracked list. */
export function mergeSyncedJob(jobs: TrackedJob[], synced: TrackedJob): TrackedJob[] {
  return jobs.map((j) => (j.id === synced.id ? { ...j, ...synced } : j));
}

export async function loadTracked(): Promise<TrackedJob[]> {
  const res = await fetch("/api/tracked-jobs", { cache: "no-store" });
  const json = (await res.json()) as ApiResult<TrackedJob[]>;
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function upsertTracked(job: TrackedJob): Promise<TrackedJob> {
  const res = await fetch("/api/tracked-jobs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  const json = (await res.json()) as ApiResult<TrackedJob>;
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function deleteTracked(id: string): Promise<void> {
  const res = await fetch(`/api/tracked-jobs?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (!json.success) throw new Error(json.error);
}

export function readLegacyLocalTracked(): TrackedJob[] | null {
  if (typeof window === "undefined") return null;
  for (const key of LEGACY_TRACKED_KEYS) {
    const stored = window.localStorage.getItem(key);
    if (stored === null) continue;
    try {
      return JSON.parse(stored) as TrackedJob[];
    } catch {
      // try the next key
    }
  }
  return null;
}

export function clearLegacyLocalTracked(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_TRACKED_KEYS) window.localStorage.removeItem(key);
}

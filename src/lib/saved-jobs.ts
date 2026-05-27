import type { JobListing, TrackedJob } from "@/types";
import { withStatus } from "@/lib/tracked-job-utils";

export const TRACKED_KEY = "jobhawk:tracked";

export { withStatus };

export function loadTracked(): TrackedJob[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(TRACKED_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as TrackedJob[];
  } catch {
    return [];
  }
}

export function writeTracked(jobs: TrackedJob[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRACKED_KEY, JSON.stringify(jobs));
}

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

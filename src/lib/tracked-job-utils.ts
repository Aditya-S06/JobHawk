import type { JobStatus, TrackedJob } from "@/types";

const APPLIED_STATUSES: JobStatus[] = ["applied", "interviewing", "rejected"];

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Set appliedAt the first time status reaches applied or later. */
export function withStatus(job: TrackedJob, status: JobStatus): TrackedJob {
  const next: TrackedJob = { ...job, status };
  if (APPLIED_STATUSES.includes(status) && !next.appliedAt) {
    next.appliedAt = todayIsoDate();
  }
  return next;
}

export function needsAppliedAt(status: JobStatus): boolean {
  return APPLIED_STATUSES.includes(status);
}

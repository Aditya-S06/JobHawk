import type { TrackedJob } from "@/types";
import type { ApiResult } from "@/types";

export type NotionSyncResult = { notionPageId: string; appliedAt?: string };

/** Coalesce concurrent syncs for the same job (e.g. React Strict Mode double-invoke). */
const inFlightByJobId = new Map<string, Promise<TrackedJob>>();

export async function syncJobToNotionApi(
  job: TrackedJob,
): Promise<TrackedJob> {
  const existing = inFlightByJobId.get(job.id);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch("/api/integrations/notion/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job }),
    });
    const json = (await res.json()) as ApiResult<NotionSyncResult>;
    if (!json.success) {
      throw new Error(json.error);
    }
    return {
      ...job,
      notionPageId: json.data.notionPageId,
      ...(json.data.appliedAt ? { appliedAt: json.data.appliedAt } : {}),
    };
  })().finally(() => {
    inFlightByJobId.delete(job.id);
  });

  inFlightByJobId.set(job.id, promise);
  return promise;
}

export async function syncAllJobsToNotionApi(
  jobs: TrackedJob[],
): Promise<TrackedJob[]> {
  const res = await fetch("/api/integrations/notion/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobs }),
  });
  const json = (await res.json()) as ApiResult<TrackedJob[]>;
  if (!json.success) {
    throw new Error(json.error);
  }
  return json.data;
}

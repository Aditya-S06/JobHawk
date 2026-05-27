import { supabaseServer } from "@/lib/supabase/server";
import type { JobStatus, TrackedJob } from "@/types";

interface JobRow {
  job_id_external: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  url: string | null;
  status: JobStatus;
  notion_page_id: string | null;
  applied_at: string | null;
}

function rowToTracked(row: JobRow): TrackedJob {
  return {
    id: row.job_id_external,
    title: row.title,
    company: row.company,
    location: row.location ?? "",
    url: row.url ?? "",
    status: row.status,
    description: row.description ?? undefined,
    notionPageId: row.notion_page_id ?? undefined,
    appliedAt: row.applied_at ?? undefined,
  };
}

export async function listTrackedForCurrentUser(): Promise<TrackedJob[]> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "job_id_external,title,company,location,description,url,status,notion_page_id,applied_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToTracked(r as JobRow));
}

export async function upsertTrackedForCurrentUser(
  job: TrackedJob,
): Promise<TrackedJob> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = {
    user_id: user.id,
    job_id_external: job.id,
    title: job.title,
    company: job.company,
    location: job.location || null,
    description: job.description ?? null,
    url: job.url || null,
    status: job.status,
    notion_page_id: job.notionPageId ?? null,
    applied_at: job.appliedAt ?? null,
  };

  const { error } = await supabase
    .from("jobs")
    .upsert(payload, { onConflict: "user_id,job_id_external" });
  if (error) throw new Error(error.message);
  return job;
}

export async function deleteTrackedForCurrentUser(externalId: string): Promise<void> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id_external", externalId);
  if (error) throw new Error(error.message);
}

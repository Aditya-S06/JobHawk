import { supabaseServer } from "@/lib/supabase/server";
import type { ResumeMeta } from "@/lib/resume-storage-types";

export interface DbResume {
  rawText: string;
  meta: ResumeMeta;
}

export async function getResumeForCurrentUser(): Promise<DbResume | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("raw_text, structured_json")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ raw_text: string; structured_json: ResumeMeta | null }>();

  if (!data) return null;
  return {
    rawText: data.raw_text ?? "",
    meta: data.structured_json ?? { source: "markdown" },
  };
}

export async function saveResumeForCurrentUser(
  rawText: string,
  meta: ResumeMeta,
): Promise<void> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // One-row-per-user model: find an existing row, update it; otherwise insert.
  const { data: existing } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from("resumes")
      .update({
        raw_text: rawText,
        structured_json: meta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("resumes").insert({
    user_id: user.id,
    raw_text: rawText,
    structured_json: meta,
  });
  if (error) throw new Error(error.message);
}

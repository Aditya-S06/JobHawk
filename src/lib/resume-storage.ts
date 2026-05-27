import type { ApiResult } from "@/types";
import {
  DEFAULT_META,
  type ResumeMeta,
  type ResumeSource,
} from "@/lib/resume-storage-types";

export type { ResumeMeta, ResumeSource };

export const RESUME_MARKDOWN_KEY = "jobhawk:resume";
export const RESUME_META_KEY = "jobhawk:resume-meta";
const LEGACY_RESUME_KEYS = ["jobhawk:resume", "vibejob:resume"] as const;
const LEGACY_RESUME_META_KEYS = [
  "jobhawk:resume-meta",
  "vibejob:resume-meta",
] as const;

interface ResumePayload {
  rawText: string;
  meta: ResumeMeta;
}

/** Read the current user's resume from the server. */
export async function loadResume(): Promise<ResumePayload> {
  const res = await fetch("/api/resume", { cache: "no-store" });
  const json = (await res.json()) as ApiResult<ResumePayload>;
  if (!json.success) {
    throw new Error(json.error);
  }
  return {
    rawText: json.data.rawText ?? "",
    meta: { ...DEFAULT_META, ...(json.data.meta ?? {}) },
  };
}

export async function saveResume(rawText: string, meta: ResumeMeta): Promise<void> {
  const res = await fetch("/api/resume", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText, meta }),
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (!json.success) {
    throw new Error(json.error);
  }
}

export async function clearResume(): Promise<void> {
  await saveResume("", { source: "markdown" });
}

/** Read whatever a previous localStorage-backed implementation wrote, under
 * either the current `jobhawk:` prefix or the older `vibejob:` prefix. */
export function readLegacyLocalResume(): ResumePayload | null {
  if (typeof window === "undefined") return null;
  let text: string | null = null;
  for (const key of LEGACY_RESUME_KEYS) {
    text = window.localStorage.getItem(key);
    if (text !== null) break;
  }
  if (text === null) return null;
  let metaRaw: string | null = null;
  for (const key of LEGACY_RESUME_META_KEYS) {
    metaRaw = window.localStorage.getItem(key);
    if (metaRaw !== null) break;
  }
  let meta: ResumeMeta = { ...DEFAULT_META };
  if (metaRaw) {
    try {
      meta = { ...DEFAULT_META, ...(JSON.parse(metaRaw) as ResumeMeta) };
    } catch {
      // ignore
    }
  }
  return { rawText: text, meta };
}

export function clearLegacyLocalResume(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_RESUME_KEYS) window.localStorage.removeItem(key);
  for (const key of LEGACY_RESUME_META_KEYS) window.localStorage.removeItem(key);
}

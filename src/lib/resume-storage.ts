export type ResumeSource = "markdown" | "pdf";

export interface ResumeMeta {
  source: ResumeSource;
  fileName?: string;
  uploadedAt?: string;
}

export const RESUME_MARKDOWN_KEY = "jobhawk:resume";
export const RESUME_META_KEY = "jobhawk:resume-meta";

const DEFAULT_META: ResumeMeta = { source: "markdown" };

export function loadResume(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(RESUME_MARKDOWN_KEY) ?? "";
}

export function loadResumeMeta(): ResumeMeta {
  if (typeof window === "undefined") return DEFAULT_META;
  const raw = window.localStorage.getItem(RESUME_META_KEY);
  if (!raw) {
    return DEFAULT_META;
  }
  try {
    return { ...DEFAULT_META, ...(JSON.parse(raw) as ResumeMeta) };
  } catch {
    return DEFAULT_META;
  }
}

export function saveResume(markdown: string, meta?: ResumeMeta): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESUME_MARKDOWN_KEY, markdown);
  if (meta) {
    window.localStorage.setItem(RESUME_META_KEY, JSON.stringify(meta));
  }
}

export function clearResume(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RESUME_MARKDOWN_KEY);
  window.localStorage.removeItem(RESUME_META_KEY);
}

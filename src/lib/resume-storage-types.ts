export type ResumeSource = "markdown" | "pdf";

export interface ResumeMeta {
  source: ResumeSource;
  fileName?: string;
  uploadedAt?: string;
}

export const DEFAULT_META: ResumeMeta = { source: "markdown" };

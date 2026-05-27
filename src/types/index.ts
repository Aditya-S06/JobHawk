// Database entities (mirror of public.* tables in Supabase).

export type JobStatus =
  | "saved"
  | "tailoring"
  | "applied"
  | "interviewing"
  | "rejected";

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  raw_text: string;
  structured_json: Record<string, unknown> | null;
  embedding: number[] | null;
  updated_at: string;
}

export interface JobRow {
  id: string;
  user_id: string;
  job_id_external: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  url: string | null;
  status: JobStatus;
  tailored_resume_text: string | null;
  created_at: string;
}

// Public API shapes.

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  apply_url: string;
  posted_at: string | null;
}

/** One page of SerpApi Google Jobs results. */
export interface JobSearchResponse {
  jobs: JobListing[];
  nextPageToken: string | null;
}

// Locally-persisted job in the user's pipeline (localStorage today,
// Supabase row in a future phase).
export interface TrackedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  status: JobStatus;
  // Optional: jobs saved before this field existed won't have it.
  description?: string;
  /** ISO date (YYYY-MM-DD) when status reached applied or later */
  appliedAt?: string;
  /** Notion page id for create/update deduping */
  notionPageId?: string;
}

export interface ResumeParseResponse {
  markdown: string;
  fileName: string;
}

export interface TailorRequest {
  resumeText: string;
  jobDescription: string;
}

export interface TailorResponse {
  tailoredResume: string;
  justification: string[];
  gapAnalysis: string[];
}

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

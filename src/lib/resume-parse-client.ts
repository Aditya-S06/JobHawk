import type { ApiResult, ResumeParseResponse } from "@/types";

export async function uploadResumePdf(file: File): Promise<ResumeParseResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/ai/resume/parse", {
    method: "POST",
    body: formData,
  });

  const json = (await res.json()) as ApiResult<ResumeParseResponse>;
  if (!json.success) {
    throw new Error(json.error);
  }
  return json.data;
}

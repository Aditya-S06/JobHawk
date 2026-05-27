/** Models to try for PDF extraction (first match with quota wins). */
export const PDF_PARSE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

export function isGeminiQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("Quota exceeded")
  );
}

export function formatGeminiError(err: unknown): { message: string; status: number } {
  if (isGeminiQuotaError(err)) {
    return {
      message:
        "Gemini API quota exceeded for PDF conversion. Wait about a minute and try again, check usage at https://ai.dev/rate-limit, or paste your resume as markdown on the Edit tab instead.",
      status: 429,
    };
  }
  const message = err instanceof Error ? err.message : "Request failed";
  return { message, status: 500 };
}

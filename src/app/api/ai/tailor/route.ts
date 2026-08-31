import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import type { ApiResult, TailorRequest, TailorResponse } from "@/types";
import { formatGeminiError } from "@/lib/gemini-errors";
import { supabaseServer } from "@/lib/supabase/server";
import { MissingKeyError, resolveUserKey } from "@/lib/user-keys";
import { allowRequest } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `Act as an elite Silicon Valley Technical Recruiter specializing in software and computer engineering internship roles. Critically analyze the input resume against the job description. Do not fabricate historical facts or experiences under any circumstance.

Output ONLY valid JSON matching the provided schema. The tailoredResume must be ATS-friendly markdown. justification must contain 3-4 specific, strategic reasons for the wording changes. gapAnalysis must list concrete skills or frameworks the candidate is missing for this role.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tailoredResume: {
      type: Type.STRING,
      description: "Fully rewritten markdown resume optimized for ATS parsing.",
    },
    justification: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 strategic reasons for the wording changes.",
    },
    gapAnalysis: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Skill or framework gaps the candidate should address.",
    },
  },
  required: ["tailoredResume", "justification", "gapAnalysis"],
};

function isTailorRequest(value: unknown): value is TailorRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.resumeText === "string" && typeof v.jobDescription === "string";
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResult<TailorResponse>>> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    if (!allowRequest(`ai-tailor:${user.id}`, 10, 60_000)) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    if (!isTailorRequest(body)) {
      return NextResponse.json(
        { success: false, error: "Body must be { resumeText, jobDescription }" },
        { status: 400 },
      );
    }

    const { resumeText, jobDescription } = body;
    if (!resumeText.trim() || !jobDescription.trim()) {
      return NextResponse.json(
        { success: false, error: "resumeText and jobDescription cannot be empty" },
        { status: 400 },
      );
    }

    const apiKey = await resolveUserKey(user, "gemini");
    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `# Candidate Resume\n${resumeText}\n\n# Target Job Description\n${jobDescription}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { success: false, error: "Model returned no text" },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, error: "Model returned non-JSON output" },
        { status: 502 },
      );
    }

    const result = parsed as TailorResponse;
    if (
      typeof result.tailoredResume !== "string" ||
      !Array.isArray(result.justification) ||
      !Array.isArray(result.gapAnalysis)
    ) {
      return NextResponse.json(
        { success: false, error: "Model output failed schema validation" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    const { message, status } = formatGeminiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

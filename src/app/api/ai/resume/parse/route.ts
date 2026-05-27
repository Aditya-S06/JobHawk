import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ApiResult, ResumeParseResponse } from "@/types";
import {
  formatGeminiError,
  isGeminiQuotaError,
  PDF_PARSE_MODELS,
} from "@/lib/gemini-errors";

const ai = new GoogleGenAI({});

const MAX_BYTES = 5 * 1024 * 1024;

const EXTRACT_PROMPT = `Extract the full resume from this PDF as clean Markdown.
Preserve logical sections (e.g. Education, Experience, Skills, Projects).
Do not invent or add any content that is not in the document.
Output only the markdown body with no code fences and no preamble.`;

async function extractMarkdownFromPdf(base64: string): Promise<string> {
  let lastError: unknown;

  for (const model of PDF_PARSE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64 } },
              { text: EXTRACT_PROMPT },
            ],
          },
        ],
        config: {
          temperature: 0.1,
        },
      });

      let markdown = response.text?.trim() ?? "";
      if (markdown.startsWith("```")) {
        markdown = markdown
          .replace(/^```(?:markdown)?\n?/, "")
          .replace(/\n?```$/, "")
          .trim();
      }
      return markdown;
    } catch (err) {
      lastError = err;
      if (isGeminiQuotaError(err)) continue;
      throw err;
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResult<ResumeParseResponse>>> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing PDF file (field name: file)" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "PDF must be 5 MB or smaller" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const markdown = await extractMarkdownFromPdf(base64);

    if (!markdown) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not extract text from this PDF. Try a text-based PDF or paste markdown manually.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        markdown,
        fileName: file.name || "resume.pdf",
      },
    });
  } catch (err) {
    const { message, status } = formatGeminiError(err);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

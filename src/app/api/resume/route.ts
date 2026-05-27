import { NextResponse, type NextRequest } from "next/server";
import {
  getResumeForCurrentUser,
  saveResumeForCurrentUser,
} from "@/lib/db/resumes";
import type { ResumeMeta } from "@/lib/resume-storage-types";
import { supabaseServer } from "@/lib/supabase/server";

async function requireAuth(): Promise<NextResponse | null> {
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
  return null;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const resume = await getResumeForCurrentUser();
    return NextResponse.json({
      success: true,
      data: resume ?? { rawText: "", meta: { source: "markdown" } },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load resume";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

interface PutBody {
  rawText?: unknown;
  meta?: unknown;
}

function isValidMeta(v: unknown): v is ResumeMeta {
  if (typeof v !== "object" || v === null) return false;
  const m = v as { source?: unknown };
  return m.source === "markdown" || m.source === "pdf";
}

export async function PUT(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = (await req.json().catch(() => null)) as PutBody | null;
    if (!body || typeof body.rawText !== "string" || !isValidMeta(body.meta)) {
      return NextResponse.json(
        { success: false, error: "Body must be { rawText, meta }" },
        { status: 400 },
      );
    }
    await saveResumeForCurrentUser(body.rawText, body.meta);
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save resume";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

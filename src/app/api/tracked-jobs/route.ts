import { NextResponse, type NextRequest } from "next/server";
import {
  deleteTrackedForCurrentUser,
  listTrackedForCurrentUser,
  upsertTrackedForCurrentUser,
} from "@/lib/db/tracked-jobs";
import type { TrackedJob } from "@/types";
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

const VALID_STATUSES = new Set([
  "saved",
  "tailoring",
  "applied",
  "interviewing",
  "rejected",
]);

function isTrackedJob(v: unknown): v is TrackedJob {
  if (typeof v !== "object" || v === null) return false;
  const j = v as Record<string, unknown>;
  return (
    typeof j.id === "string" &&
    typeof j.title === "string" &&
    typeof j.company === "string" &&
    typeof j.location === "string" &&
    typeof j.url === "string" &&
    typeof j.status === "string" &&
    VALID_STATUSES.has(j.status as string)
  );
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const jobs = await listTrackedForCurrentUser();
    return NextResponse.json({ success: true, data: jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load jobs";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/** Upsert a single job. */
export async function PUT(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isTrackedJob(body)) {
      return NextResponse.json(
        { success: false, error: "Body must be a TrackedJob" },
        { status: 400 },
      );
    }
    const saved = await upsertTrackedForCurrentUser(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save job";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Query param 'id' is required" },
        { status: 400 },
      );
    }
    await deleteTrackedForCurrentUser(id);
    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

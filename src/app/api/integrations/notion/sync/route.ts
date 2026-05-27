import { NextResponse } from "next/server";
import type { TrackedJob } from "@/types";
import { syncJobToNotion, syncJobsToNotion } from "@/lib/notion-jobs";
import { supabaseServer } from "@/lib/supabase/server";
import { MissingKeyError, resolveUserKey } from "@/lib/user-keys";

export async function POST(request: Request) {
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

    const [token, dataSourceId] = await Promise.all([
      resolveUserKey(user.id, "notion"),
      resolveUserKey(user.id, "notion_data_source"),
    ]);
    const creds = { token, dataSourceId };

    const body = (await request.json()) as { job?: TrackedJob; jobs?: TrackedJob[] };

    if (body.jobs && Array.isArray(body.jobs)) {
      const synced = await syncJobsToNotion(creds, body.jobs);
      return NextResponse.json({ success: true, data: synced });
    }

    if (body.job) {
      const synced = await syncJobToNotion(creds, body.job);
      return NextResponse.json({
        success: true,
        data: {
          notionPageId: synced.notionPageId!,
          appliedAt: synced.appliedAt,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Request body must include job or jobs" },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Notion sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

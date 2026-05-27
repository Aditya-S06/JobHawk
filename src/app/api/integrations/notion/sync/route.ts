import { NextResponse } from "next/server";
import type { TrackedJob } from "@/types";
import { syncJobToNotion, syncJobsToNotion } from "@/lib/notion-jobs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { job?: TrackedJob; jobs?: TrackedJob[] };

    if (body.jobs && Array.isArray(body.jobs)) {
      const synced = await syncJobsToNotion(body.jobs);
      return NextResponse.json({ success: true, data: synced });
    }

    if (body.job) {
      const synced = await syncJobToNotion(body.job);
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
    const message = err instanceof Error ? err.message : "Notion sync failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

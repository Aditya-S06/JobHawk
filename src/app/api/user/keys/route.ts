import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto";
import {
  listUserKeyStatus,
  type KeyProvider,
} from "@/lib/user-keys";
import type { ApiResult } from "@/types";

const PROVIDERS: KeyProvider[] = [
  "serpapi",
  "gemini",
  "notion",
  "notion_data_source",
];

function isProvider(v: unknown): v is KeyProvider {
  return typeof v === "string" && (PROVIDERS as string[]).includes(v);
}

async function requireUserId(): Promise<string | NextResponse> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<ApiResult<never>>(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  return user.id;
}

export async function GET() {
  const userIdOrResp = await requireUserId();
  if (typeof userIdOrResp !== "string") return userIdOrResp;
  try {
    const status = await listUserKeyStatus(userIdOrResp);
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load keys";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const userIdOrResp = await requireUserId();
  if (typeof userIdOrResp !== "string") return userIdOrResp;
  const userId = userIdOrResp;

  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (
      typeof body !== "object" ||
      body === null ||
      !isProvider((body as { provider?: unknown }).provider) ||
      typeof (body as { value?: unknown }).value !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Body must be { provider, value }" },
        { status: 400 },
      );
    }

    const provider = (body as { provider: KeyProvider }).provider;
    const value = (body as { value: string }).value.trim();

    const admin = supabaseAdmin();

    if (value === "") {
      await admin
        .from("user_api_keys")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider);
      return NextResponse.json({ success: true, data: { provider, set: false } });
    }

    const encrypted = encryptSecret(value);
    const { error } = await admin.from("user_api_keys").upsert(
      {
        user_id: userId,
        provider,
        encrypted_value: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: { provider, set: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save key";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

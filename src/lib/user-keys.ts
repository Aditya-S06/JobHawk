import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";

export type KeyProvider = "serpapi" | "gemini" | "notion" | "notion_data_source";

export type KeyUser = { id: string; email?: string | null };

export const PROVIDER_LABELS: Record<KeyProvider, string> = {
  serpapi: "SerpApi",
  gemini: "Gemini",
  notion: "Notion",
  notion_data_source: "Notion data source ID",
};

const OWNER_ENV_MAP: Record<KeyProvider, string> = {
  serpapi: "SERPAPI_API_KEY",
  gemini: "GEMINI_API_KEY",
  notion: "NOTION_TOKEN",
  notion_data_source: "NOTION_DATA_SOURCE_ID",
};

export class MissingKeyError extends Error {
  readonly provider: KeyProvider;
  constructor(provider: KeyProvider) {
    super(
      `Add your ${PROVIDER_LABELS[provider]} key in Settings to use this feature.`,
    );
    this.name = "MissingKeyError";
    this.provider = provider;
  }
}

function isOwnerAccount(email: string | null | undefined): boolean {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail || !email) return false;
  return email.trim().toLowerCase() === ownerEmail;
}

function getOwnerFallback(
  user: KeyUser,
  provider: KeyProvider,
): string | null {
  if (!isOwnerAccount(user.email)) return null;

  // Legacy fallback: if NOTION_DATA_SOURCE_ID is empty, fall back to
  // NOTION_DATABASE_ID (matches the existing notion-jobs.ts behavior).
  const direct = process.env[OWNER_ENV_MAP[provider]];
  if (direct) return direct;
  if (provider === "notion_data_source") {
    const legacy = process.env.NOTION_DATABASE_ID;
    if (legacy) return legacy;
  }
  return null;
}

/**
 * Returns the user's API key for the given provider.
 * 1. Checks the user_api_keys table (decrypts).
 * 2. If missing AND session email === OWNER_EMAIL, falls back to env keys.
 * 3. Otherwise throws MissingKeyError.
 *
 * Owner check uses auth identity (getUser().email), not profiles.email.
 */
export async function resolveUserKey(
  user: KeyUser,
  provider: KeyProvider,
): Promise<string> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("user_api_keys")
    .select("encrypted_value")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle<{ encrypted_value: string }>();

  if (data?.encrypted_value) {
    try {
      return decryptSecret(data.encrypted_value);
    } catch {
      throw new Error("Failed to read stored key");
    }
  }

  const fallback = getOwnerFallback(user, provider);
  if (fallback) return fallback;

  throw new MissingKeyError(provider);
}

/** Returns a map of which providers have a key set for this user (incl. owner fallback). */
export async function listUserKeyStatus(
  user: KeyUser,
): Promise<Record<KeyProvider, boolean>> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("user_api_keys")
    .select("provider")
    .eq("user_id", user.id);

  const set = new Set((data ?? []).map((r) => r.provider as KeyProvider));
  const result: Record<KeyProvider, boolean> = {
    serpapi: set.has("serpapi"),
    gemini: set.has("gemini"),
    notion: set.has("notion"),
    notion_data_source: set.has("notion_data_source"),
  };

  for (const provider of Object.keys(result) as KeyProvider[]) {
    if (result[provider]) continue;
    if (getOwnerFallback(user, provider)) result[provider] = true;
  }

  return result;
}

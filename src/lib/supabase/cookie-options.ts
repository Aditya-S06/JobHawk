import type { CookieOptions } from "@supabase/ssr";

/**
 * Session cookies for HTTPS production. SameSite Lax is the CSRF model for
 * same-origin cookie APIs. httpOnly is left to @supabase/ssr (false) because
 * the browser client must read/write the session on login/signup.
 */
export function getSupabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

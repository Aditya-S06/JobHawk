export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/auth/callback",
  "/api/auth",
  "/privacy",
  "/terms",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Minimal stand-in for `supabase.auth.getUser()` — tests inject this. */
export type SessionUser = { id: string } | null;

export type SessionGateResult =
  | { kind: "allow" }
  | { kind: "login"; next: string }
  | { kind: "search" };

/**
 * Dashboard/session gate. Same rules as middleware: logged-out users may
 * hit public paths (including /signup); everyone else goes to /login.
 * Signed-in users are bounced off /login and /signup to /search.
 *
 * `next` is the raw pathname; middleware still runs it through
 * `safeRedirectPath` before putting it on the login URL.
 */
export function sessionGate(
  user: SessionUser,
  pathname: string,
): SessionGateResult {
  if (!user && !isPublicPath(pathname)) {
    return { kind: "login", next: pathname };
  }
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return { kind: "search" };
  }
  return { kind: "allow" };
}

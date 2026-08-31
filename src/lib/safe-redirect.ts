/**
 * Allow only same-origin relative paths for post-login `next` redirects.
 * Rejects protocol-relative URLs, backslashes, whitespace, and control chars.
 */
const APP_PATH = /^\/(?:[A-Za-z0-9._~-]+\/?)*$/;

export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/search",
): string {
  if (!next) return fallback;
  if (next.includes("\\") || next.includes("//") || next.includes("://")) {
    return fallback;
  }
  if (!APP_PATH.test(next)) return fallback;
  return next;
}

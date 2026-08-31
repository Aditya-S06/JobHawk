import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPublicPath,
  sessionGate,
  type SessionUser,
} from "../src/lib/auth-paths.ts";
import { safeRedirectPath } from "../src/lib/safe-redirect.ts";

/**
 * Fake `supabase.auth.getUser()` result. No network, no live project.
 */
function mockGetUser(authenticated: boolean): SessionUser {
  if (!authenticated) return null;
  return { id: "user-test-1" };
}

describe("isPublicPath", () => {
  it("allows signup, login, legal, and auth callback without a session", () => {
    assert.equal(isPublicPath("/"), true);
    assert.equal(isPublicPath("/signup"), true);
    assert.equal(isPublicPath("/login"), true);
    assert.equal(isPublicPath("/privacy"), true);
    assert.equal(isPublicPath("/terms"), true);
    assert.equal(isPublicPath("/auth/callback"), true);
    assert.equal(isPublicPath("/api/auth/signout"), true);
  });

  it("gates dashboard and user-data APIs", () => {
    assert.equal(isPublicPath("/search"), false);
    assert.equal(isPublicPath("/settings"), false);
    assert.equal(isPublicPath("/api/user/keys"), false);
    assert.equal(isPublicPath("/api/resume"), false);
  });
});

describe("sessionGate (mocked Supabase getUser)", () => {
  it("lets a logged-out visitor reach /signup", () => {
    const user = mockGetUser(false);
    assert.deepEqual(sessionGate(user, "/signup"), { kind: "allow" });
  });

  it("sends a logged-out visitor from /search to /login", () => {
    const user = mockGetUser(false);
    assert.deepEqual(sessionGate(user, "/search"), {
      kind: "login",
      next: "/search",
    });
  });

  it("sends a logged-in visitor off /signup and /login to /search", () => {
    const user = mockGetUser(true);
    assert.deepEqual(sessionGate(user, "/signup"), { kind: "search" });
    assert.deepEqual(sessionGate(user, "/login"), { kind: "search" });
  });

  it("lets a logged-in visitor stay on the dashboard", () => {
    const user = mockGetUser(true);
    assert.deepEqual(sessionGate(user, "/search"), { kind: "allow" });
  });
});

describe("safeRedirectPath (post-login next)", () => {
  it("rejects protocol-relative and off-site next values", () => {
    assert.equal(safeRedirectPath("//evil.com"), "/search");
    assert.equal(safeRedirectPath("https://evil.com"), "/search");
    assert.equal(safeRedirectPath("/search"), "/search");
  });
});

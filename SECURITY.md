# Security

JobHawk is a **personal portfolio / demo** app on Vercel with public source. It is
not a production SaaS. There is no SOC 2, WAF, or “bank-grade” encryption claim.
Accounts and stored data may be wiped if the demo is reset or shut down. Do not
put irreplaceable secrets in Settings; treat BYO keys as disposable.

## Auth (hashed passwords and session)

- Passwords are hashed and stored by **Supabase Auth**, not by this app. There is no local password table.
- Sessions are Supabase Auth cookies via `@supabase/ssr`. Middleware and the dashboard layout call `getUser()` (not `getSession()` alone) before gated pages.
- **Signup gate:** `/signup` and `/login` are public. All other app routes require a session. Logged-in visitors hitting `/signup` or `/login` are sent to `/search`. Smoke tests cover this with a mocked `getUser()` result; they do not call a live Supabase project.

Cookie flags come from `@supabase/ssr`. `Secure` in production (HTTPS). `SameSite=Lax` for same-origin cookie APIs. `httpOnly` is **not** set (library default `false`) because login/signup run in the browser client and must read/write the session cookie. XSS can still steal the session JWT; this does not put `ENCRYPTION_KEY` or `SERVICE_ROLE_KEY` in cookies.

## Key encryption

- Per-user SerpApi / Gemini / Notion keys are stored as AES-256-GCM ciphertext in `user_api_keys`, keyed by `ENCRYPTION_KEY` (server-only).
- GET `/api/user/keys` returns booleans only. Writes go through the service-role client **after** `getUser()`, scoped to that user id.
- Env fallback (`SERPAPI_API_KEY`, `GEMINI_API_KEY`, Notion) is allowed only when `getUser().email` matches `OWNER_EMAIL`. `profiles.email` is not used for this check.

## Other hardened items

- **Redirects:** Post-login `next` and `/auth/callback?next=` accept same-origin app paths only (ASCII path segments; no `//`, whitespace, or control characters).
- **Signup/login errors:** UI does not show raw Auth error strings (avoids “user already registered” enumeration). Login/signup are browser calls to Supabase Auth; hosted Auth rate limits apply. Paid proxies (`/api/jobs/search`, `/api/ai/tailor`, `/api/ai/resume/parse`, `/api/integrations/notion/sync`) use a per-user in-memory limiter (per Vercel instance only).
- **Cache:** SerpApi search cache is keyed by `sha256(apiKey)`, not the raw key.
- **Schema:** `user_api_keys` keeps RLS on with no anon/authenticated policies (ciphertext is service-role only). `handle_new_user` is `SECURITY DEFINER` with `search_path = ''`. Apply [`supabase/phase2-harden.sql`](supabase/phase2-harden.sql) on an existing database; new setups use [`supabase/schema.sql`](supabase/schema.sql).
- **Legal:** `/privacy` and `/terms` are public. Contact is GitHub issues, not `OWNER_EMAIL` in the client bundle.

`ENCRYPTION_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are not `NEXT_PUBLIC_` and those modules import `server-only`.

## Out of scope

- Upstash / global rate limits, pentest of production, custom password hashing, WAF, moving `handle_new_user` out of `public`.
- File storage buckets (PDF is parsed in memory; markdown is stored).
- Applying `phase2-harden.sql` to the live project from this repo automatically — paste it in the SQL Editor. Until that runs, an authenticated user may still read **their own** `user_api_keys` ciphertext via the Data API (not other users’ rows).
- Changing job search from GET to POST (SameSite=Lax cookies can be sent on top-level GET navigations).
- Generic 500s on resume/tracked-jobs routes (they still may echo PostgREST wording; queries stay scoped to `user.id`).

## Reporting

Use GitHub issues on the public JobHawk repository. Do not file exploit write-ups against the live deployment in issues that include payloads.

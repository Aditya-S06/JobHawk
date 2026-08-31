# JobHawk

Next.js App Router app in `src/`. Work from this directory (`vibejob/`).

## Install, run, test

```bash
npm install
cp .env.example .env.local   # fill keys locally; see README
npm run dev                  # http://localhost:3000
npm test                     # session-gate smoke tests (mocked Supabase, no live project)
npm run lint
npm run build
```

Schema: paste `supabase/schema.sql` in the Supabase SQL Editor. Existing projects also need `supabase/phase2-harden.sql`.

Logged-out `/search` should redirect to `/login`. Signup is real Supabase Auth at `/signup`.

## Do not

- Commit `.env.local` or any real API keys. `.env.example` stays empty placeholders only.
- Put `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, or `OWNER_EMAIL` in `NEXT_PUBLIC_` vars or client code.
- Delete the shadcn UI kit under `src/components/ui/` except unused files.
- Add product features from `PLAN.md` (streaming coach, Playwright apply agent, embeddings) until this foundation pass is merged.

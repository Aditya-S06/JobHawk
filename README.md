# JobHawk

JobHawk is a job search and AI career coach web app built for engineering students hunting internships and new-grad roles. Search live listings, save roles you care about, tailor your resume to each posting with Gemini, and track applications in a simple pipeline—with optional sync to Notion.

## Features

| Area | What it does |
|------|----------------|
| **Search Jobs** | Fetches Google Jobs results via SerpApi. Filters sponsored posts, supports Remote/Hybrid tags, and **caches results locally** so switching tabs does not burn API quota. |
| **Save & track** | Save interesting postings from search; they appear in the Application Tracker with direct links to apply. |
| **My Resume** | Edit and preview your master resume as Markdown (stored in the browser for now). |
| **AI Coach** | Paste a job description and get an ATS-oriented tailored resume, edit justification, and gap analysis via structured Gemini output. |
| **Application Tracker** | Kanban-style pipeline: Saved → Tailoring → Applied → Interviewing → Rejected. |
| **Notion sync** | Optional server-side sync of tracked jobs to a Notion data source. |

## Tech stack

- **Framework:** [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com)
- **Search:** [SerpApi](https://serpapi.com) (Google Jobs engine)
- **AI:** [@google/genai](https://www.npmjs.com/package/@google/genai) (`gemini-3.1-flash-lite`, structured JSON)
- **Database (schema ready):** [Supabase](https://supabase.com) + pgvector
- **Tracker sync (optional):** Notion API

## Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)
- API keys: SerpApi, Google AI Studio (Gemini), and optionally Supabase + Notion

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `SERPAPI_API_KEY` | Yes (search) | Google Jobs search |
| `GEMINI_API_KEY` | Yes (AI coach) | Resume tailoring |
| `NEXT_PUBLIC_SUPABASE_URL` | Later | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Later | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Later | Server-side Supabase (keep secret) |
| `NOTION_TOKEN` | Optional | Notion integration |
| `NOTION_DATA_SOURCE_ID` | Optional | Notion job table data source |

Never commit `.env.local` or real API keys. Only `.env.example` belongs in git.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will land on **Search Jobs**.

### 4. Supabase (optional, for persistence)

Run the SQL in [`supabase/schema.sql`](supabase/schema.sql) in your Supabase project’s SQL Editor. This creates `profiles`, `resumes`, and `jobs` tables with Row Level Security. Frontend auth wiring is planned for a later phase; the app currently uses `localStorage` for resume, search cache, and saved jobs.

### 5. Notion (optional)

1. Create a Notion database with properties: **Name** (title), **Company**, **Progress** (select), **JobHawk ID** (text), **Link** (url), **Applied** (date).
2. Set `NOTION_TOKEN` and `NOTION_DATA_SOURCE_ID` in `.env.local`.
3. Use the tracker UI or `node scripts/test-notion-sync.mjs` to verify sync.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/
    (dashboard)/     # Search, Resume, Coach, Tracker pages
    api/
      jobs/search/   # SerpApi proxy
      ai/tailor/     # Gemini structured tailoring
  components/        # UI + sidebar
  lib/               # saved-jobs, resume-storage, notion-jobs
  types/             # Shared TypeScript types
supabase/
  schema.sql         # Database schema
```

## Pushing to GitHub

From the project root:

```bash
git add .
git commit -m "Initial JobHawk app: search, tracker, AI tailor"
git remote add origin https://github.com/YOUR_USERNAME/jobhawk.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME/jobhawk` with your repository URL. Confirm `git status` does not list `.env.local` before you push.

## Roadmap

See [`PLAN.md`](PLAN.md) for the full architecture blueprint (Supabase auth, streaming coach chat, Playwright apply agent, and more).

## License

Private / personal project unless you add a license file.

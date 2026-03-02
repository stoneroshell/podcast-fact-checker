# Scio

**Scio** (working name) is a listener empowerment tool: it lets podcast listeners instantly access context, verification, and deeper understanding of claims made in podcast episodes — without manually Googling or prompting AI tools elsewhere.

## Tech stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS  
- **Backend:** Next.js API routes (Vercel serverless)  
- **Database & Auth:** Supabase (PostgreSQL + optional Google sign-in)  
- **APIs:** Podcast Index (search + metadata), OpenAI (claim analysis), SerpAPI (web context)

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

## Setup

1. **Clone and install**

   ```bash
   cd fact-checker-app
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Fill in `.env` with your Supabase, Podcast Index, OpenAI, and SerpAPI keys. See [project.md](./project.md) §9.4 for details.

3. **Database**

   Run the Supabase migration in `supabase/migrations/001_episodes_claims_cache.sql` in your Supabase project (SQL Editor or CLI).

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `app/` — Next.js App Router pages and API routes  
- `app/components/` — React components (podcast, transcript, claim, ui)  
- `lib/` — DB client, Podcast Index, OpenAI pipeline, search, pipeline  
- `types/` — Shared TypeScript types  
- `supabase/migrations/` — SQL migrations  

Full architecture, data model, and phased plan are in **[project.md](./project.md)**.

## Scripts

| Command   | Description        |
|----------|--------------------|
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Production build   |
| `npm run start` | Start production   |
| `npm run lint`  | Run ESLint         |

## License

Private. All rights reserved.

# Scio — Project Architecture & Development Guide

**Working name:** Scio  
**Document purpose:** Long-term development guide. Prioritizes clarity, architectural foresight, scalability, and phased implementation.

---

## 1. Core Mission

Empower podcast listeners to instantly access context, verification, and deeper understanding of claims made in podcast episodes — without manually Googling or prompting AI tools elsewhere.

**Scio is a listener empowerment tool.**

- **Primary product value:** The intelligence layer (claim analysis + contextual research).
- **Secondary:** Transcript syncing and UI seamlessness.

---

## 2. Product Philosophy

The product does **not** declare absolute truth. It:

- Classifies claims
- Provides context
- Presents supporting and contradicting evidence
- Assigns an evidence-based accuracy score (see §6)
- Encourages informed interpretation

**Claim types the system must distinguish:**

| Type | Description |
|------|-------------|
| Verifiable factual claim | Can be checked against sources |
| Opinion | Subjective stance |
| Prediction | Forward-looking assertion |
| Value judgment | Moral or aesthetic evaluation |
| Rhetorical statement | Not intended as literal fact |

**Tone:** Neutral and analytical. No political bias framing.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| **Frontend** | Next.js (App Router), React, Tailwind | Server Components where appropriate |
| **Backend** | Next.js API routes | Serverless on Vercel |
| **Auth** | Supabase Auth | Optional sign-in; Google provider from day 1 |
| **Database** | PostgreSQL (Supabase) | Episodes, transcripts, claims, cache |
| **APIs** | See §3.1 | |
| **Hosting** | Vercel | Free plan initially |

### 3.1 API Plan

| Purpose | Provider | Notes |
|---------|----------|--------|
| Podcast search + metadata | [Podcast Index API](https://podcastindex.org/api) | Search, episode metadata, `<podcast:transcript>` when present |
| Fact-checking / context analysis | OpenAI Chat API (GPT-3.5-turbo or GPT-4o-mini) | Free trial for testing; then usage limits to control cost |
| Web context / source retrieval | **Recommendation: SerpAPI** (alternative: DuckDuckGo) | See §3.2 |

### 3.2 Web Search API Recommendation

- **SerpAPI:** Structured JSON, good quality, 100 free searches/month then paid. Fits controlled usage and caching; easy to stay within budget if cached aggressively.
- **DuckDuckGo:** Free. Instant Answer API is limited; HTML scraping is brittle and may break. Use if budget is zero for search; otherwise prefer SerpAPI with strict limits and caching.

**Decision:** Document both; default implementation target **SerpAPI** with fallback path for DuckDuckGo or “no web results” when over limit or unavailable.

---

## 4. Data Model

Schema is designed so Phase 2 and Phase 3 can be added without refactoring core tables.

### 4.1 Entity Relationship Overview

```
Podcast (metadata on Episode only — no separate table in Phase 1)
Episode 1 — * TranscriptSentence
Episode 1 — * Claim (optional sentence_id, optional user_id later)
Claim — * ClaimEvidence (supporting/contradicting)
ClaimCache (global, keyed by normalized claim text)
```

### 4.2 Tables

#### `episodes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `podcast_id` | text | Podcast Index feed ID |
| `podcast_title` | text | Display; refetch from API when needed |
| `podcast_image_url` | text | Cover art |
| `episode_title` | text | |
| `episode_description` | text | Optional |
| `audio_url` | text | Enclosure URL |
| `published_at` | timestamptz | Optional |
| `transcript_json` | jsonb | Array of transcript sentence objects |
| `transcript_source` | enum | `podcast_index` \| `manual` \| `whisper` (Phase 2) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### Transcript sentence object (inside `transcript_json`)

Stored as array elements. Each element:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable id (e.g. uuid or index-based) |
| `text` | string | Sentence text |
| `start_time` | number \| null | Seconds; null until Phase 2 |
| `end_time` | number \| null | Seconds; null until Phase 2 |

#### `claims`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `episode_id` | uuid FK | |
| `sentence_id` | text \| null | References `transcript_json[].id`; null for manual paste or extension |
| `selected_text` | text | Normalized input (sentence or pasted/selected text) |
| `classification` | text | Claim type (see §2) |
| `accuracy_percentage` | smallint | 0–100 (see §6) |
| `context_summary` | text | |
| `supporting_evidence` | jsonb | Array of { summary, source_id, quote } |
| `contradicting_evidence` | jsonb | Array of { summary, source_id, quote } |
| `confidence_score` | smallint | 0–100 |
| `sources` | jsonb | Array of { id, url, title, snippet } |
| `created_at` | timestamptz | |
| `user_id` | uuid FK null | Optional; for future “my history” (Phase 1 can leave null) |

#### `claim_cache` (global reuse)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `normalized_claim_hash` | text UNIQUE | SHA-256 or similar of normalized claim text |
| `normalized_claim_text` | text | For debugging / cache invalidation |
| `result_json` | jsonb | Full pipeline output (accuracy, evidence, sources, etc.) |
| `created_at` | timestamptz | |

Lookup order: (1) by `episode_id` + `sentence_id` or `selected_text` if from same episode; (2) by `normalized_claim_hash` for cross-episode reuse.

#### Future: `users` (Supabase Auth)

Supabase provides `auth.users`. Use a minimal `public.profiles` or rely on `auth.users` plus optional `user_id` on `claims` when building history in a later phase.

### 4.3 Support Matrix

| Scenario | episode_id | sentence_id | selected_text | user_id |
|----------|------------|-------------|---------------|---------|
| Click sentence in transcript | ✓ | ✓ | from sentence | optional |
| Manual paste | ✓ | null | pasted text | optional |
| Chrome extension (Phase 3) | optional | null | selected text | optional |

---

## 5. Fact-Checking Pipeline Architecture

### 5.1 Flow (Deterministic Structure)

1. **Normalize input** — Trim, collapse whitespace, optional light cleanup (e.g. leading “So,” “And”).
2. **Check caches**  
   - By `episode_id` + `sentence_id` or `selected_text` (if from episode).  
   - By `normalized_claim_hash` (global).
3. **Extract core claim** — LLM step: single sentence, factual core (no hedging).
4. **Classify claim type** — Verifiable fact / opinion / prediction / value judgment / rhetorical.
5. **Generate search queries** — 1–3 queries from core claim (LLM or rules).
6. **Web search** — Call SerpAPI (or fallback); top N results (e.g. N=5–8).
7. **Retrieve content** — Optional: fetch snippets or minimal page text; stay within rate/budget.
8. **Structured evaluation** — Single LLM call with:
   - Core claim  
   - Claim type  
   - Search results + snippets  
   - Structured output schema (see §5.2)
9. **Persist** — Save to `claims` and optionally to `claim_cache` (by normalized text hash).
10. **Return** — JSON to client.

### 5.2 Output Schema (Structured JSON)

```ts
{
  claimClassification: string;           // enum from §2
  accuracyPercentage: number;            // 0–100
  contextSummary: string;
  supportingEvidence: Array<{ summary: string; sourceId: string; quote?: string }>;
  contradictingEvidence: Array<{ summary: string; sourceId: string; quote?: string }>;
  confidenceScore: number;               // 0–100
  sources: Array<{ id: string; url: string; title: string; snippet: string }>;
  uncertaintyNote?: string;              // when evidence is limited
}
```

Use OpenAI structured outputs (JSON schema or response format) to avoid drift.

### 5.3 Accuracy Scale (Single Scale)

**Definition:** “Given available evidence, how well does the claim hold?”

| Band | Range | Label | Meaning |
|------|--------|--------|---------|
| Low | 0–30 | Low support | Evidence mostly contradicts or is absent |
| Mixed | 31–70 | Mixed / nuanced | Conflicting or partial evidence |
| High | 71–100 | Well supported | Evidence largely supports the claim |

- Always pair with **context summary** and **uncertainty note** when confidence or evidence is limited.
- Never present as “true/false”; present as evidence-based band + explanation.

### 5.4 Confidence Score

- **Confidence** = reliability of the analysis (source quality, clarity of evidence), not the same as accuracy.
- 0–100: e.g. high when multiple strong sources agree; low when few or weak sources.

### 5.5 Source Citation Format

- Each piece of evidence references a `source_id` that maps to `sources[]`.
- Display: title (link), snippet, optional “Quote” in UI.
- Store URLs and titles; avoid hallucinated URLs (validate or only use URLs returned by search API).

### 5.6 Caching Strategy (Pipeline)

- **Key 1:** `(episode_id, sentence_id)` or `(episode_id, selected_text_hash)` for same-episode reuse.
- **Key 2:** `normalized_claim_hash` for global reuse (any episode, manual, extension).
- **TTL:** Optional (e.g. 30 days) to allow re-running if sources or world change; Phase 1 can be “cache forever” with manual invalidation if needed.
- **Storage:** `claim_cache` table; in-memory or serverless cache (e.g. Vercel KV) optional later for speed.

---

## 6. Guardrails

- No political bias framing; neutral, analytical language.
- Avoid absolute “True/False” labeling; use accuracy band + context.
- Always provide context and nuance where evidence is mixed or limited.
- Avoid hallucinated citations: only cite URLs/sources returned by search (or clearly mark as “model summary, no external source” if no search).
- Clearly state uncertainty when evidence is limited (`uncertaintyNote` and/or low confidence score).

---

## 7. Phased Implementation

### Phase 1 — MVP (Intelligence First)

**User flow:**

1. User searches for podcast (Podcast Index API).
2. User selects episode.
3. App attempts transcript via Podcast Index `<podcast:transcript>`.
4. If transcript: parse and display as structured sentences. If not: allow paste/upload of transcript; each sentence becomes clickable (or user selects segment).
5. User clicks sentence (or submits pasted text).
6. Backend runs fact-check pipeline (§5).
7. Return structured result; display in side panel (claim type, accuracy band, context, evidence, sources).

**Transcript optional; fact-checking mandatory.** Anonymous use allowed; optional sign-in (Supabase + Google) from day 1. User history not in scope but schema supports `user_id` for later.

### Phase 2 — Transcript + Audio Sync

- Optional Whisper-based transcription for episodes without transcript.
- Timestamped transcript model (`start_time` / `end_time`).
- HTML audio player; sentence highlighting synced to playback.
- Same claim-check backend; no schema change for claims.

### Phase 3 — Seamless Layer

- Chrome extension: highlight text on web players → send to API → show overlay result.
- Reuse same backend and `claims` model; `episode_id` optional, `selected_text` required.

---

## 8. Non-Goals (Current Scope)

- Real-time automatic claim detection
- Spotify integration
- Full-episode auto-transcription as default
- Large-scale scraping infrastructure
- Native mobile apps

---

## 9. Development Milestones

### 9.1 Suggested Folder Structure

```
/app
  /layout.tsx
  /page.tsx                    # Home: podcast search
  /episode/[id]
    /page.tsx                  # Episode detail + transcript
    /layout.tsx                # Optional
  /api
    /podcasts
      /search/route.ts          # GET ?q=
      /episode/[id]/route.ts   # GET episode + transcript
    /transcript
      /parse/route.ts          # POST paste/upload → sentences
    /claim
      /check/route.ts          # POST { episodeId?, sentenceId?, selectedText }
  /components
    /podcast
      SearchForm.tsx
      EpisodeCard.tsx
      EpisodeHeader.tsx        # Title, cover, description
    /transcript
      TranscriptView.tsx       # Sentences, clickable
      SentenceLine.tsx
    /claim
      ClaimPanel.tsx           # Side panel result
      ClaimSummary.tsx
      EvidenceList.tsx
      SourceCitation.tsx
    /ui                         # Buttons, modals, layout
/lib
  /db
    client.ts                  # Supabase client
    episodes.ts
    claims.ts
    claim-cache.ts
  /podcast-index
    client.ts
    types.ts
  /openai
    claim-pipeline.ts
    prompts.ts
  /search
    serpapi.ts                 # or duckduckgo.ts
  /pipeline
    normalize.ts
    run-pipeline.ts
/types
  claim.ts
  episode.ts
/supabase
  migrations/
    001_episodes_claims_cache.sql
```

### 9.2 API Route Summary

| Method | Route | Purpose |
|--------|--------|---------|
| GET | `/api/podcasts/search?q=` | Query Podcast Index; return list for typeahead/selection |
| GET | `/api/podcasts/episode/[id]` | Episode by id; include transcript if present |
| POST | `/api/transcript/parse` | Body: raw text or file → structured sentences |
| POST | `/api/claim/check` | Body: `{ episodeId?, sentenceId?, selectedText }` → run pipeline, return result + store claim |

Auth: protect only if/when you add “my history”; Phase 1 can leave routes public with optional `userId` from session.

### 9.3 Component Architecture

- **Server Components:** `app/page.tsx`, `app/episode/[id]/page.tsx` for data fetch (episode, transcript). Use for SEO and initial load.
- **Client Components:** Search form, transcript interactions (click sentence), claim panel, audio player (Phase 2). Keep client tree narrow; pass data as props.
- **State:** Episode + transcript from server; selected sentence and claim result in client state (e.g. React state or small store). No global auth required for MVP; use Supabase session when present for optional `user_id` on claims.

### 9.4 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Server-only; migrations or admin

# Podcast Index
PODCAST_INDEX_API_KEY=
PODCAST_INDEX_API_SECRET=

# OpenAI
OPENAI_API_KEY=

# Web search (choose one)
SERPAPI_API_KEY=              # If using SerpAPI
# or DUCKDUCKGO_* if implementing fallback

# Optional
CLAIM_CACHE_TTL_DAYS=30
MAX_SEARCH_RESULTS=6
```

Use a single `.env.example` with empty values and comments; never commit secrets.

### 9.5 Rate Limiting Strategy

- **Vercel:** Use Vercel’s rate limit (e.g. by IP) for `/api/claim/check` to cap abuse (e.g. 20 req/min per IP for free tier).
- **OpenAI:** Server-side cap: max N claim checks per minute per IP (or per user when logged in); return 429 with Retry-After when exceeded.
- **SerpAPI:** Stay under plan limits; one search per claim (after cache miss). Consider in-memory or DB “search budget” per IP/day if needed.
- **Podcast Index:** Respect their limits; cache episode metadata and transcript by `episode_id` for 24h to reduce calls.

### 9.6 Caching Strategy (Application)

| Data | Where | TTL / Strategy |
|------|--------|-----------------|
| Episode metadata + transcript | DB (`episodes`) | Persistent; refresh on demand or 24h |
| Claim result (same episode + sentence) | `claims` + optional `claim_cache` | Permanent (or 30 days per §5.6) |
| Claim result (same text, other episode) | `claim_cache` by normalized hash | Same as above |
| Podcast Index response | In-memory or KV (optional) | 5–15 min for search; 24h for episode fetch |
| SerpAPI results | Not stored raw; only pipeline output in `claim_cache` | — |

### 9.7 Risk Analysis

| Risk | Mitigation |
|------|------------|
| **Transcript availability** | Many episodes lack `<podcast:transcript>`; manual paste is first-class. Phase 2 Whisper optional. Set expectation in UI. |
| **API cost overrun** | Rate limits, aggressive caching, GPT-3.5-turbo or 4o-mini, SerpAPI free tier + cap. Alerts at 80% of budget. |
| **Search quality / bias** | Use multiple queries; structured prompt to compare sources; present both supporting and contradicting evidence; avoid single-source verdicts. |
| **LLM inconsistency** | Structured output schema; same prompt and model; cache by normalized claim to reduce variance for same claim. |
| **Hallucinated citations** | Only allow URLs from search API in `sources`; validate links before display. |
| **Compliance / attribution** | Clear “Sources” section; link to origin; no scraping without respecting ToS (use official APIs / snippets). |
| **Auth scope creep** | Phase 1: optional sign-in only; no required account. Defer “my history” to later phase. |

### 9.8 Cost Control Strategy

- **Budget cap:** $20/month during development. No fixed per-service split; prioritize “don’t exceed total.”
- **OpenAI:** Prefer GPT-3.5-turbo or GPT-4o-mini; set max tokens on completion; one-shot evaluation where possible; cache all results (§5.6).
- **SerpAPI:** Use free tier; if paid, set monthly cap; one search per cache miss; reuse cache aggressively.
- **Vercel:** Free plan; watch serverless invocations and bandwidth.
- **Supabase:** Free tier; monitor DB size and auth MAU.
- **Operational:** Rate limit `/api/claim/check`; consider “daily claim check cap” per IP (e.g. 30) during dev; add simple dashboard or log-based alert when API spend exceeds threshold.

---

## 10. Tone of This Document

This document is a product and technical reference: clear, structured, forward-looking, and pragmatic. Updates should keep the same tone and keep non-goals and phases explicit so future work stays aligned with the mission and budget.

---

*Last updated: March 2025. Living document; revise as decisions and phases evolve.*

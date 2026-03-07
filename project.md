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

The fact-checking pipeline implements the **source-hierarchy** (v1) design: structured extraction, **query diversification**, multi-query search, tier-based authority scoring in code, single evaluator call, **evidence clustering**, weighted consensus, and deterministic confidence. See **source-hierarchy.md** for authority tier definitions and **lib/authority/domain-to-tier.ts** for URL-to-tier mapping (with tier criteria comments).

### 5.1 Flow (Deterministic Structure)

1. **Normalize input** — Trim, collapse whitespace, optional light cleanup (e.g. leading “So,” “And”).
2. **Check caches**  
   - By `episode_id` + `sentence_id` or `selected_text` (if from episode).  
   - By `normalized_claim_hash` (global).
3. **Structured extraction** — One LLM call: core assertion (one sentence), entities, date range (if present), domain (medical | legal | finance | politics | historical | tech | general). Also classify claim type: verifiable fact / opinion / prediction / value judgment / rhetorical.
4. **Query diversification** — One LLM call: generate 3–5 verification queries from the assertion (direct, alternative phrasing, counterclaims). Fallback: use assertion only if generation fails.
5. **Multi-query search** — Run search for each generated query plus two fixed authority queries: `assertion + site:gov OR site:edu` and `assertion + fact check`. Merge results by URL, dedupe, cap at configured limit. Tag results that came from the fact-check query for later weighting.
6. **Authority scoring (code)** — Map each result URL to tier via `lib/authority/domain-to-tier`. Tier scale: 1 = highest authority, 6 = lowest. Drop Tier 6. Sort by tier ascending (best first). **Strong** = tier 1, 2, or 3 (tier ≤ 3). If fewer than 2 strong sources → return **Insufficient Evidence** and do not call the evaluator; persist and return.
7. **Structured evaluation** — Single LLM call with strong sources only (tier ≤ 3, up to 8). Evidence-only prompt; classifies each source into supportingEvidence, contradictingEvidence, or neutralEvidence. Domain-specific rules apply (e.g. medical/health: correlation vs causation, observational vs clinical trials; use verdict **Contested** and cap accuracyScore when evidence is purely observational/correlational). Verdict can be True | False | Misleading | Contested | **Outdated** | Insufficient Evidence. **Outdated** = claim was historically well-supported but recent sources contradict it due to a time-sensitive shift (world changed), not an ongoing dispute.
8. **Evidence clustering** — Group evidence by stance: **support**, **contradict**, **context** (neutral). Compute **consensusScore** (0–100) from cluster-level weights: supportWeight / (supportWeight + contradictWeight); context is not used in the ratio.
9. **Verdict and accuracy** — If consensus is non-null, map consensus to verdict (e.g. >70 → True, 40–70 → Contested, <40 → False) and may override the LLM verdict; set accuracyScore/accuracyLabel to match. Apply overrides: (a) if a tier-1–3 fact-check source contradicts and verdict is True → Contested; (b) if claim has superlative/high-authority and verdict True, require consensus or tier-2/3 support bar or else Contested; (c) **coherence check**: if confidence < 55 and verdict is True or False → override to Contested (definitive verdict with low confidence is contradictory).
10. **Confidence (code)** — Compute 0–100 from source mix, verdict, evidence weights, and **consensusScore**. High consensus for the claim → confidence floor; strong negative consensus (verdict False, consensus 0) → high confidence (sources agree the claim is false). Contested/Outdated cap confidence. Not set by the LLM.
11. **Persist** — Save to `claims` and `claim_cache` (by normalized text hash). Map verdict, evidenceSummary, sourcesUsed (with tier), confidence, accuracyScore, consensusScore to schema.
12. **Return** — JSON to client.

Optional (v1): Snippets only; no full-page fetch. Retrieve content (fetch snippets or minimal page text) is Phase 2.

### 5.2 Output Schema (Structured JSON)

v1 schema (see **source-hierarchy.md** §9 and **types/claim.ts**):

```ts
{
  verdict: "True" | "False" | "Misleading" | "Contested" | "Outdated" | "Insufficient Evidence";
  accuracyScore: number;        // 0–100; from evaluator or overridden to match verdict
  accuracyLabel: string;        // Rubric band (e.g. "Accurate But Simplified")
  evidenceSummary: string;
  sourcesUsed: Array<{ url: string; title?: string; snippet?: string; tier: 1 | 2 | 3 | 4 | 5; weight?: number; fromFactCheckQuery?: boolean }>;
  confidence: number;           // 0–100, computed in code; coherent with consensusScore
  consensusScore?: number;      // 0–100, support/(support+contradict) by weight; null if no support/contradict
  claimClassification: string;  // From extraction step
  supportingEvidence: Array<{ summary: string; sourceId: string; quote?: string }>;
  contradictingEvidence: Array<{ summary: string; sourceId: string; quote?: string }>;
  neutralEvidence?: Array<{ summary: string; sourceId: string; quote?: string }>;
  sources: Array<{ id: string; url: string; title: string; snippet: string }>;
  // ... contextSummary, accuracyPercentage, confidenceScore (alias), uncertaintyNote
}
```

Use OpenAI structured outputs (JSON schema or response format) to avoid drift. Persist to `claims` / `claim_cache`: map `evidenceSummary` → context_summary, `sourcesUsed` → sources (with tier), `confidence` → confidence_score; store verdict. Accuracy and consensus are kept coherent: when verdict is overridden from consensus or by coherence check, accuracyScore/accuracyLabel are set to match.

### 5.3 Verdict and Evidence Bands

v1 primary output is **verdict**: True | False | Misleading | Contested | **Outdated** | Insufficient Evidence. **Contested** = sources disagree now (genuine dispute). **Outdated** = claim was historically well-supported but recent sources contradict it due to a time-sensitive factual shift — the world changed. For display or legacy compatibility, accuracy bands can be derived from accuracyScore. 

**Definition (legacy bands):** “Given available evidence, how well does the claim hold?”

| Band | Range | Label | Meaning |
|------|--------|--------|---------|
| Low | 0–30 | Low support | Evidence mostly contradicts or is absent |
| Mixed | 31–70 | Mixed / nuanced | Conflicting or partial evidence |
| High | 71–100 | Well supported | Evidence largely supports the claim |

- Always pair with **evidence summary** and clear source tier labels when confidence or evidence is limited.
- Never present unverified claims confidently; use **Insufficient Evidence** when strong_sources &lt; 2 (strong = tier 1, 2, or 3).

### 5.4 Confidence Score

- **Confidence** = reliability of the analysis (source quality, evidence agreement, consensus), computed **in code** from source mix, verdict, and consensusScore (see **lib/pipeline/confidence.ts**). Not set by the LLM.
- 0–100. High consensus for the claim raises or protects confidence; strong negative consensus (verdict False, consensus 0) yields high confidence (sources agree the claim is false). Contested/Outdated cap at 60. Kept coherent with accuracyScore and consensusScore so they do not contradict (e.g. consensus 100 with confidence 50 is avoided).

### 5.5 Source Citation Format

- v1: Evidence references `sourcesUsed[]` with `url` and `tier`; map to `sources` for persistence.
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
  /authority
    domain-to-tier.ts          # URL → tier (1–6); tier criteria in comments
  /pipeline
    normalize.ts
    run-pipeline.ts
    confidence.ts              # Deterministic confidence from sources, verdict, consensus
    consensus.ts               # Weighted consensus from clusters; consensusToVerdict
    source-weight.ts
    accuracy-rubric.ts
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

## 10. Implementation Chunks

Phased implementation plan for Phase 1. Use for next-session planning.

### Chunk A — Search and Episode APIs (done)

- **Podcast Index client:** Auth (key + secret), `searchPodcasts`, `getEpisodeById`, `getEpisodesByFeedId` ([lib/podcast-index/client.ts](lib/podcast-index/client.ts)).
- **Transcript:** Parse from PI transcript URL (JSON/SRT/plain) → [lib/transcript/parse-from-podcast-index.ts](lib/transcript/parse-from-podcast-index.ts).
- **DB:** Column `podcast_index_episode_id` on `episodes`; [lib/db/episodes.ts](lib/db/episodes.ts) `getEpisodeById` (UUID or external id), `upsertEpisode`.
- **Routes:** GET `/api/podcasts/search?q=`, GET `/api/podcasts/feed/[feedId]/episodes`, GET `/api/podcasts/episode/[id]` (UUID or Podcast Index id → fetch, transcript, upsert, return).

### Chunk B — Wire Phase 1 UI (next)

Wire the full Phase 1 user flow so a user can search → pick episode → see transcript → click sentence → see claim result. No new APIs; connect existing components and routes.

1. **Home page** ([app/page.tsx](app/page.tsx))
   - Render `SearchForm`. Add client state: query, results, loading.
   - On input (debounced), GET `/api/podcasts/search?q=...`, display results (e.g. `EpisodeCard` per feed or per episode).
   - Flow: either (a) search returns feeds → on feed click, GET `/api/podcasts/feed/[feedId]/episodes` → show episode list → link to `/episode/[episodeId]` (Podcast Index id), or (b) search returns episodes and link directly to `/episode/[id]`. Use episode id in URL so episode page can load it.
   - Navigate to `/episode/[id]` when user selects an episode (id = Podcast Index episode id from feed/episodes response).

2. **Episode page** ([app/episode/[id]/page.tsx](app/episode/[id]/page.tsx))
   - Fetch episode: server-side (e.g. `getEpisodeById` from DB or fetch from API) or client fetch to GET `/api/podcasts/episode/[id]`. [id] can be Podcast Index id (first visit) or internal UUID (return visit).
   - Render `EpisodeHeader` (title, cover, description), `TranscriptView` (sentences from `episode.transcript_json`), and `ClaimPanel` (side panel).
   - If no transcript: show “Paste transcript” or upload; use POST `/api/transcript/parse` if needed, then display sentences as clickable.

3. **Claim flow (client state + TranscriptView + ClaimPanel)**
   - In a client wrapper (or episode page client section): state for `selectedSentence` (id + text), `claimResult` (`ClaimResult | null`), `isLoading`.
   - `TranscriptView`: pass `onSelect(sentence)` so that on sentence click: set selected sentence, set `isLoading` true, POST `/api/claim/check` with body `{ episodeId: episode.id, sentenceId: sentence.id, selectedText: sentence.text }` (use internal `episode.id` from API response). On response: set `claimResult` to response JSON, set `isLoading` false.
   - `ClaimPanel`: pass `result={claimResult}` and `isLoading`. Show loading state; when result is set, show claim type, verdict/accuracy band, context, evidence, sources (per §5.2, §9.1 components).

4. **Components to wire**
   - [SearchForm](app/components/podcast/SearchForm.tsx): state, debounced search, results list, navigate to episode or feed episodes.
   - [EpisodeCard](app/components/podcast/EpisodeCard.tsx) / list: use in search or feed results; link to `/episode/[id]`.
   - [EpisodeHeader](app/components/podcast/EpisodeHeader.tsx): receive episode, display title, image, description.
   - [TranscriptView](app/components/transcript/TranscriptView.tsx): receive sentences; `onSelect` callback; replace no-op with actual claim-check call.
   - [ClaimPanel](app/components/claim/ClaimPanel.tsx): already accepts `result` and `isLoading`; ensure parent passes them from claim flow state.

5. **Out of scope for Chunk B**
   - Landing page visual/style polish (separate pass).
   - Auth, user history, rate limiting UI.

---

## 11. Tone of This Document

This document is a product and technical reference: clear, structured, forward-looking, and pragmatic. Updates should keep the same tone and keep non-goals and phases explicit so future work stays aligned with the mission and budget.

---

*Last updated: March 2025. Living document; revise as decisions and phases evolve.*

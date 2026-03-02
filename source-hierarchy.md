Scio — Source Prioritization & Fact-Checking Architecture

Purpose:
Define how Scio retrieves, ranks, filters, and synthesizes external information when verifying claims using OpenAI + search/RAG. This document governs epistemic authority, weighting logic, and contradiction handling.

Scio must prefer evidence over fluency and authority over volume.

---

Implementation: v1 (Current)

v1 implements an evidence gate with simple tier-based authority, structured extraction, and deterministic confidence. Full 5-dimension scoring and advanced retrieval are deferred.

Pipeline (5 steps):

STEP 1 — Structured Extraction (one LLM call)
- Input: raw claim text.
- Output: core assertion (one sentence), entities, date range (if present), domain.
- Domain enum: medical | legal | finance | politics | historical | tech | general.
- Used for: search precision, recency rules, domain overrides.

STEP 2 — Multi-Query Search
- Run 2–3 searches: (1) assertion, (2) assertion + site:gov OR site:edu, (3) assertion + "fact check".
- Merge and dedupe by URL; rank by tier (Tier 1 first, then 2, 3).
- No tier-first branching; ranking enforces hierarchy after a single merge.

STEP 3 — Authority Scoring (code only)
- Map each result’s domain (URL) to tier (see §2). Tier 1 = 5, Tier 2 = 4, Tier 3 = 3.
- v1 uses authority-from-domain + recency only (no primary_proximity, transparency, consensus_support).
- Drop Tier 6 entirely. Allow Tier 5 only if Tier 1–4 results < 2; if used, label clearly.
- Count “strong” sources: Tier ≥ 3.
- Guardrail: If strong_sources < 2 → return "Insufficient Evidence" and do not call the evaluator.

STEP 4 — Evaluator Call (single LLM)
- Input: only Tier ≥ 3 sources (or Tier 5 fallback when allowed), plus assertion, claim type, domain.
- Prompt: evidence-only (base verdict only on provided snippets; no prior knowledge); source-quality awareness; if sources conflict on core claim → Verdict: Contested, present both sides; if fewer than 2 strong sources in context → treat as insufficient.
- Output: structured JSON per §9 (v1 schema).

STEP 5 — Confidence Calculation (code, not LLM)
- Deterministic formula from source mix, e.g.:
  - 2× Tier 3 → 65–75%
  - 1× Tier 1 + 1× Tier 3 → 85–95%
  - Contested → cap at 60%
- Persist verdict, evidenceSummary, sourcesUsed (with tier), confidence.

What NOT to build in v1
- Full 5-dimension scoring (primary_proximity, transparency, consensus_support).
- Separate contradiction-detection LLM pass (contradiction handled inside evaluator prompt).
- Embedding-based clustering.
- Full-page scraping / fetch (snippets only for v1).
- Complex consensus modeling.
- Tier-first retrieval branching (use multi-query + rank instead).

---

1. Core Principle

Scio does not treat all sources equally.

Every retrieved document must be evaluated against a structured authority hierarchy and assigned a quantitative score before being allowed to influence final output.

Generation happens after ranking and filtering — never before.

2. Source Authority Hierarchy

Sources are grouped into six tiers. Higher tiers override lower tiers in case of contradiction.

Tier 1 — Primary Sources (Highest Authority)

Definition: Original, unfiltered records.

Examples

Peer-reviewed original research papers

Government datasets and releases

Court rulings and statutory text

Official corporate filings (10-K, 10-Q, 8-K)

Official transcripts

Historical archives

Direct statements from institutions

Retrieval Weight

authority_score = 5

Rules

Always prefer original PDF or official publication over summaries.

If Tier 1 exists, suppress lower-tier summaries unless needed for context.

If multiple primary sources conflict, mark as “contested.”

Tier 2 — Institutional Authorities

Definition: Organizations with formal review and governance.

Examples

Government agencies (.gov)

Major medical institutions

Academic research centers (.edu)

International bodies (UN, WHO, IMF)

Standards organizations (ISO, IEEE)

Retrieval Weight

authority_score = 4

Rules

Prefer official publications over blog pages.

Prefer published reports over press summaries.

Tier 3 — High-Standard Journalism

Definition: Established editorial processes and corrections policy.

Examples

Reuters

Associated Press

Financial Times

Wall Street Journal

BBC

Retrieval Weight

authority_score = 3

Rules

Require confirmation from 2 independent outlets.

Use for reporting events, not scientific conclusions.

Do not treat journalism as primary evidence if primary exists.

Tier 4 — Academic & Domain Expert Commentary

Definition: Credentialed interpretation or analysis.

Retrieval Weight

authority_score = 2

Rules

Label clearly as interpretation.

Separate fact vs. expert opinion in output.

Never treat analysis as data.

Tier 5 — Aggregators & Secondary Compilations

Examples: Wikipedia, Statista, Britannica, Investopedia.

authority_score = 1. Use only to locate primary citations; never as final authority.

v1: Allow Tier 5 only if Tier 1–4 results < 2; if used, label clearly. Do not let aggregators anchor the answer.

Tier 6 — User Generated / Social (Lowest)

Examples: Reddit, Medium blogs, Twitter/X, YouTube commentary. authority_score = 0. Never use as verification source.

v1: Always exclude Tier 6 from results passed to the evaluator (filter in code).

3. Quantitative Scoring Model

Target (future): Each retrieved source scored across 5 dimensions — authority, primary_proximity, transparency, recency, consensus_support (sum 0–25); only sources ≥14 influence generation.

v1 (current): Authority-from-domain + recency only. No primary_proximity, transparency, or consensus_support (avoids extra LLM/heuristics and latency).
- authority = mapDomainToTier(domain) → Tier 1=5, Tier 2=4, Tier 3=3, etc.
- recency = simple date-based scoring when applicable (domain-dependent; see §4).
- Threshold: require ≥2 sources with Tier ≥3 before calling the evaluator. Approximate “≥14” structurally: only Tier ≥3 count as “strong”; Tier 4 allowed only as fallback; Tier 5 only if Tier 1–4 results < 2; Tier 6 always excluded.

4. Recency Logic

Recency weighting must depend on domain (from structured extraction: medical, legal, finance, politics, historical, tech, general).

Apply recency weighting for: politics, finance, technology, public health guidance.

Do NOT penalize for: historical events, mathematics, established scientific laws.

v1: Use simple date-based scoring when applicable; full decay function (e.g. recency_score = 5 * e^(-λ * age_in_days)) can be added later. Domain classification (Step 1) drives whether recency is applied.

5. Multi-Source Confirmation Rule

For factual claims: require at least 2 independent strong sources before generating an answer.

v1: “Strong” = Tier ≥3. Require ≥2 sources Tier ≥3. If only one exists, return “Insufficient Evidence” (no evaluator call). If high-scoring sources contradict → Verdict: Contested (handled in evaluator prompt).

Never present disputed claims as settled fact.

6. Contradiction Detection

Target (future): Separate pass to cluster statements and detect conflicts before final answer.

v1: Contradiction handled inside the single evaluator call. Prompt instructs: if sources conflict materially on the core factual claim, output Verdict: Contested, present both sides, avoid definitive language. No separate LLM pass.

7. Domain-Specific Overrides
Medical

Prioritize:

Systematic reviews

Meta-analyses

RCTs

Official clinical guidelines

Deprioritize:

Health blogs

Supplement marketing sites

Legal

Prioritize:

Statutory text

Court opinions

Official state/federal databases

Deprioritize:

Legal commentary blogs

Finance

Prioritize:

SEC filings

Earnings transcripts

Central bank releases

Deprioritize:

Market commentary sites

Trading blogs

Historical

Prioritize:

Academic historians

University press publications

Archive material

8. Retrieval Strategy (RAG Implementation Guidance)

Target (future): Tiered retrieval (Tier 1 domains first, then 2, 3, others if needed); full 5-dimension scoring; then synthesis.

v1 (current):
- Step 1 — Structured extraction: one LLM call → assertion, entities, date range, domain (§ Implementation: v1).
- Step 2 — Multi-query search: run (1) assertion, (2) assertion + site:gov OR site:edu, (3) assertion + "fact check". Merge and dedupe by URL; rank by tier (no tier-first branching).
- Step 3 — Authority scoring in code: map domain → tier; drop Tier 6; allow Tier 5 only if Tier 1–4 < 2; count strong (Tier ≥3). If strong_sources < 2 → return Insufficient Evidence, no evaluator call.
- Step 4 — Single evaluator call with Tier ≥3 (or fallback) sources; evidence-only prompt; contradiction → Contested in same call.
- Step 5 — Confidence computed in code from source mix (e.g. 2× Tier 3 → 65–75%; Contested → cap 60%).

9. Output Requirements

Every fact-check output must include: claim evaluated, verdict, evidence summary, source tier labels, confidence score (0–100%).

v1 — Structured evaluator output (JSON):

```json
{
  "verdict": "True | False | Misleading | Contested | Insufficient Evidence",
  "evidenceSummary": "...",
  "sourcesUsed": [ { "url": "...", "tier": 1|2|3|4|5 } ],
  "confidence": 0
}
```

Confidence is 0–100; computed in code per Implementation: v1 Step 5 (e.g. 2× Tier 3 → 65–75%; 1× Tier 1 + 1× Tier 3 → 85–95%; Contested → cap at 60%).

10. Hard Rules

Scio must never:

Rely on single low-tier source.

Treat consensus appearance as truth.

Fill gaps with model inference.

Present unverified claims confidently.

Use AI-generated content as evidence.

If insufficient authoritative evidence exists:
Return “Insufficient Evidence.”

11. Architectural Guardrail

Generation must be gated behind retrieval quality.

v1 — Hybrid approach: (1) Code: filter to Tier ≥3; if strong_sources < 2, return "Insufficient Evidence" and do not call the evaluator. (2) Prompt: instruct evaluator that if fewer than 2 strong sources are in context, treat as insufficient; never rely on prompt alone. Confidence is computed in code from source mix, not by the LLM.

Pseudocode:

if strong_sources < 2:
    return "Insufficient evidence"  # no evaluator call

else:
    generate_answer_from_ranked_sources()  # contradiction → Contested in same call
12. Design Philosophy

Scio is not a chatbot.
Scio is an evidence engine.

Fluency is secondary.
Authority is primary.
Uncertainty is acceptable.
Confident inaccuracy is not.
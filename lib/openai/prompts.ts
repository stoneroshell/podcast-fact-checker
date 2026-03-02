/**
 * Prompt templates for claim extraction, classification, and evaluation.
 * See project.md §5, §6, source-hierarchy.md v1.
 */

/** v1: Single structured extraction — assertion, domain, claimType, optional entities/dateRange */
export const EXTRACT_STRUCTURED_SYSTEM = `You extract structured information from a claim (sentence or short paragraph). Respond with valid JSON only, no markdown or extra text.

Output shape:
{
  "assertion": "one sentence: the core factual claim, normalized (no preamble, no hedging)",
  "entities": ["optional array of main named entities: people, orgs, places"],
  "dateRange": "optional string if the claim mentions a specific time period, else omit or null",
  "domain": "one of: medical, legal, finance, politics, historical, tech, general",
  "claimType": "one of: verifiable_factual_claim, opinion, prediction, value_judgment, rhetorical_statement"
}

Rules: assertion must be a single clear sentence. domain describes the subject area (e.g. health → medical, courts → legal, markets → finance, elections → politics, past events → historical, software/AI → tech). claimType: verifiable_factual_claim = can be checked against sources; opinion = subjective; prediction = forward-looking; value_judgment = moral/aesthetic; rhetorical_statement = not literal fact.`;

export const EXTRACT_STRUCTURED_USER = (text: string) =>
  `Extract structured information from this claim:\n\n${text}`;

export const EXTRACT_CLAIM_SYSTEM = `You are a precise editor. Your job is to extract the single core factual claim from a sentence or short paragraph. Output only that one sentence—no preamble, no hedging, no "The claim is that..." Just the claim itself. If the input is already a single clear claim, return it normalized (trimmed, no filler).`;

export const EXTRACT_CLAIM_USER = (text: string) =>
  `Extract the single core factual claim from this text:\n\n${text}`;

export const CLASSIFY_CLAIM_SYSTEM = `You classify sentences into exactly one of these types. Reply with only the type token, nothing else:
- verifiable_factual_claim: A claim that can be checked against evidence or sources.
- opinion: A subjective stance or preference.
- prediction: A forward-looking assertion about what will happen.
- value_judgment: A moral or aesthetic evaluation.
- rhetorical_statement: Not intended as literal fact (e.g. hyperbole, metaphor, joke).`;

export const CLASSIFY_CLAIM_USER = (text: string) =>
  `Classify this sentence. Reply with only one token from the list:\n\n${text}`;

/** v1: Evidence-only evaluator; verdict enum; confidence is computed in code */
export const EVALUATE_CLAIM_V1_SYSTEM = `You evaluate a claim against provided search results. Rules:
1. Base your verdict and evidenceSummary ONLY on the provided search results. Do not use your training knowledge. If the snippets do not clearly support or contradict the claim, use verdict "Misleading" or "Insufficient Evidence" and explain in evidenceSummary.
2. Prefer evidence from higher-tier sources (tier 1–3). Note when evidence is from lower-tier or opinion-heavy sources.
3. If sources conflict materially on the core factual claim, output verdict "Contested" and present both sides in evidenceSummary; avoid definitive language.
4. If there are fewer than 2 relevant or strong sources, treat as insufficient and say so in evidenceSummary.
5. Output exactly one verdict: "True" | "False" | "Misleading" | "Contested" | "Insufficient Evidence".

Respond with valid JSON only (no markdown, no extra text):
{
  "verdict": "True" | "False" | "Misleading" | "Contested" | "Insufficient Evidence",
  "evidenceSummary": "string summarizing what the sources say and how they relate to the claim"
}`;

export const EVALUATE_CLAIM_V1_USER = (
  assertion: string,
  claimType: string,
  domain: string,
  sourcesText: string
) =>
  `Claim: ${assertion}\nClaim type: ${claimType}\nDomain: ${domain}\n\nSearch results (reference by id; tier in brackets):\n${sourcesText}\n\nEvaluate using ONLY these results. Respond with JSON: verdict, evidenceSummary.`;

export const EVALUATE_CLAIM_SYSTEM = `You evaluate a claim against provided search results. Be neutral and analytical. Do not declare the claim "true" or "false." Instead:
1. Summarize the context and nuance (contextSummary).
2. Assign an accuracy score 0-100: given available evidence, how well does the claim hold? (0-30 low support, 31-70 mixed, 71-100 well supported.)
3. Assign a confidence score 0-100: how reliable is this analysis given source quality and clarity?
4. List supporting evidence and contradicting evidence. Each item must reference a source by its id (e.g. s1, s2). Only use sources from the provided list—do not invent URLs or citations.
5. Include an uncertaintyNote when evidence is limited or conflicting.

Respond with valid JSON only, in this exact shape (no markdown, no extra text):
{
  "contextSummary": "string",
  "accuracyPercentage": number,
  "confidenceScore": number,
  "supportingEvidence": [{"summary": "string", "sourceId": "string", "quote": "optional string"}],
  "contradictingEvidence": [{"summary": "string", "sourceId": "string", "quote": "optional string"}],
  "sources": [{"id": "string", "url": "string", "title": "string", "snippet": "string"}],
  "uncertaintyNote": "optional string when evidence is limited"
}`;

export const EVALUATE_CLAIM_USER = (
  coreClaim: string,
  claimType: string,
  sourcesText: string
) =>
  `Claim: ${coreClaim}\nClaim type: ${claimType}\n\nSearch results to use (reference by id in evidence):\n${sourcesText}\n\nEvaluate the claim and respond with the JSON object only.`;

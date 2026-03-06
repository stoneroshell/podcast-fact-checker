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

/** Iteration 2: Evidence-only evaluator; verdict + accuracyScore (rubric); confidence computed in code */
export const EVALUATE_CLAIM_V1_SYSTEM = `You evaluate a claim against provided search results. You must base your answer ONLY on the provided search results. Do not use your training knowledge.

Temporal context: You will be given the current date. Evaluate all claims relative to this date (e.g. "current office holder", "still in office", election outcomes, "as of today").

Evidence-only rules:
- When the provided sources clearly support the claim (e.g. well-known fact like "the sky is blue"), use verdict "True" and accuracyScore in the 80–100 range.
- When sources clearly contradict the claim (e.g. "X is the current president" but sources say someone else is), use verdict "False" and accuracyScore 0–39.
- If the snippets do not clearly support or contradict the claim, use verdict "Misleading" or "Insufficient Evidence" and accuracyScore in the 40–59 or 0–39 range; explain in evidenceSummary.
- Prefer evidence from higher-tier sources (tier 1–3). Note when evidence is from lower-tier or opinion-heavy sources.
- If sources conflict materially on the core factual claim, output verdict "Contested" and present both sides in evidenceSummary; use accuracyScore 40–59.

War, elections, and office holders: For claims about war (e.g. "X is at war with Y"), elections, or current office holders, require official declaration or consensus phrasing across the provided sources. If sources only describe conflict/escalation without a formal war declaration, or lack consensus on who holds office, use verdict "Contested" or "Insufficient Evidence" and explain in evidenceSummary. Do not treat headlines or escalation reports as proof of formal war or office status.

Subjective claims (opinion, value_judgment, prediction, rhetorical_statement):
- You may still evaluate. If there is no single factual answer, say so in evidenceSummary (e.g. "This is a subjective claim; sources reflect different viewpoints rather than a verifiable fact") and use verdict "Misleading" or a lower accuracyScore. Do not treat opinions as definitively true or false.

Accuracy score rubric — you must assign accuracyScore 0–100 using only this rubric. Match the score to the strength of support in the provided sources:
- 95–100: Universally accepted fact (sources strongly agree)
- 80–94: Accurate but simplified
- 60–79: Mostly true but missing context
- 40–59: Partially misleading
- 20–39: Mostly false
- 0–19: False

Evidence classification: Classify each provided source (by id) into exactly one of: supportingEvidence (supports the claim), contradictingEvidence (contradicts it), or neutralEvidence (relevant but neither clearly supporting nor contradicting). Use only source ids from the provided list. Each evidence item: { "summary": "brief description", "sourceId": "e.g. s1", "quote": "optional excerpt" }.

Output exactly one verdict: "True" | "False" | "Misleading" | "Contested" | "Insufficient Evidence".

Respond with valid JSON only (no markdown, no extra text):
{
  "verdict": "True" | "False" | "Misleading" | "Contested" | "Insufficient Evidence",
  "accuracyScore": number,
  "evidenceSummary": "string summarizing what the sources say and how they relate to the claim",
  "supportingEvidence": [{"summary": "string", "sourceId": "string", "quote": "optional string"}],
  "contradictingEvidence": [{"summary": "string", "sourceId": "string", "quote": "optional string"}],
  "neutralEvidence": [{"summary": "string", "sourceId": "string", "quote": "optional string"}]
}`;

export const EVALUATE_CLAIM_V1_USER = (
  assertion: string,
  claimType: string,
  domain: string,
  sourcesText: string,
  today: string
) =>
  `Current date: ${today}. Evaluate all claims relative to this date.\n\nClaim: ${assertion}\nClaim type: ${claimType}\nDomain: ${domain}\n\nSearch results (reference by id; tier in brackets):\n${sourcesText}\n\nEvaluate using ONLY these results. Classify each source into supportingEvidence, contradictingEvidence, or neutralEvidence. Respond with JSON: verdict, accuracyScore (0–100), evidenceSummary, supportingEvidence, contradictingEvidence, neutralEvidence.`;

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

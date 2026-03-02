/**
 * Prompt templates for claim extraction, classification, and evaluation.
 * See project.md §5, §6 (guardrails: neutral, no true/false, context + nuance).
 */

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

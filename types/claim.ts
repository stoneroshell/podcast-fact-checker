/**
 * Claim and fact-check result types.
 * See project.md §5.2, §4.2 (claims table), source-hierarchy.md v1.
 */

export type ClaimVerdict =
  | "True"
  | "False"
  | "Misleading"
  | "Contested"
  | "Insufficient Evidence";

export type ClaimClassification =
  | "verifiable_factual_claim"
  | "opinion"
  | "prediction"
  | "value_judgment"
  | "rhetorical_statement";

export type ClaimEvidenceItem = {
  summary: string;
  sourceId: string;
  quote?: string;
};

export type ClaimSource = {
  id: string;
  url: string;
  title: string;
  snippet: string;
};

/** Source with authority tier (1–5). Used for v1 pipeline; confidence is computed in code from this. */
export type SourceWithTier = {
  url: string;
  title?: string;
  snippet?: string;
  tier: 1 | 2 | 3 | 4 | 5;
};

export type ClaimResult = {
  /** v1: Verdict from evaluator; set to "Insufficient Evidence" when strong_sources < 2 (no evaluator call). */
  verdict: ClaimVerdict;
  /** v1: Primary evidence summary; alias contextSummary for backward compat. */
  evidenceSummary: string;
  /** v1: Sources used with tier; confidence is computed in code from this, not by LLM. */
  sourcesUsed: SourceWithTier[];
  /** 0–100; v1: computed in code from sourcesUsed + verdict, not by LLM. */
  confidence: number;
  claimClassification: string;
  /** Legacy / backward compat. */
  accuracyPercentage: number;
  contextSummary: string;
  supportingEvidence: ClaimEvidenceItem[];
  contradictingEvidence: ClaimEvidenceItem[];
  /** @deprecated use confidence */
  confidenceScore: number;
  sources: ClaimSource[];
  uncertaintyNote?: string;
};

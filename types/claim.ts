/**
 * Claim and fact-check result types.
 * See project.md §5.2, §4.2 (claims table), source-hierarchy.md v1.
 */

export type ClaimVerdict =
  | "True"
  | "False"
  | "Misleading"
  | "Contested"
  | "Outdated"
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
  /** Numeric weight for weighted consensus (tier + optional fact-check bonus). */
  weight?: number;
  /** True if this result came from the "fact check" search query. */
  fromFactCheckQuery?: boolean;
};

export type ClaimResult = {
  /** v1: Verdict from evaluator; set to "Insufficient Evidence" when strong_sources < 2 (no evaluator call). */
  verdict: ClaimVerdict;
  /** Iteration 2: 0–100 from evaluator; rubric-based. */
  accuracyScore: number;
  /** Iteration 2: Rubric band label derived in code from accuracyScore (e.g. "Accurate But Simplified"). */
  accuracyLabel: string;
  /** v1: Primary evidence summary; alias contextSummary for backward compat. */
  evidenceSummary: string;
  /** v1: Sources used with tier; confidence is computed in code from this, not by LLM. */
  sourcesUsed: SourceWithTier[];
  /** 0–100; v1: computed in code from sourcesUsed + verdict, not by LLM. */
  confidence: number;
  claimClassification: string;
  /** Legacy / backward compat; mirrors accuracyScore when set. */
  accuracyPercentage: number;
  contextSummary: string;
  supportingEvidence: ClaimEvidenceItem[];
  contradictingEvidence: ClaimEvidenceItem[];
  /** Evidence that is relevant but neither clearly supporting nor contradicting. */
  neutralEvidence?: ClaimEvidenceItem[];
  /** 0–100; percentage of supporting vs (supporting + contradicting) sources; computed in code. */
  consensusScore?: number;
  /** @deprecated use confidence */
  confidenceScore: number;
  sources: ClaimSource[];
  uncertaintyNote?: string;
};

/**
 * Claim and fact-check result types.
 * See project.md §5.2, §4.2 (claims table).
 */

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

export type ClaimResult = {
  claimClassification: string;
  accuracyPercentage: number;
  contextSummary: string;
  supportingEvidence: ClaimEvidenceItem[];
  contradictingEvidence: ClaimEvidenceItem[];
  confidenceScore: number;
  sources: ClaimSource[];
  uncertaintyNote?: string;
};

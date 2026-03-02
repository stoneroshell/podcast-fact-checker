/**
 * OpenAI claim pipeline: extract claim, classify, evaluate with structured output.
 * See project.md §5.1, §5.2.
 */
import type { ClaimResult } from "@/types/claim";

export async function extractCoreClaim(text: string): Promise<string> {
  // TODO: LLM call to reduce to single factual core sentence
  return text;
}

export async function classifyClaim(text: string): Promise<string> {
  // TODO: LLM or rules → ClaimClassification
  return "verifiable_factual_claim";
}

export async function evaluateClaim(
  coreClaim: string,
  claimType: string,
  searchResults: { title: string; snippet: string; url: string }[]
): Promise<ClaimResult> {
  // TODO: Single LLM call with structured output (JSON schema); return ClaimResult
  return {
    claimClassification: claimType,
    accuracyPercentage: 0,
    contextSummary: "",
    supportingEvidence: [],
    contradictingEvidence: [],
    confidenceScore: 0,
    sources: [],
  };
}

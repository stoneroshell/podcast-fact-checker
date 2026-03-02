/**
 * Full fact-check pipeline: normalize → cache check → extract → classify → search → evaluate → persist.
 * See project.md §5.1.
 */
import type { ClaimResult } from "@/types/claim";
import { normalizeClaimInput, normalizedClaimHash } from "./normalize";
// TODO: import getCachedClaim, setCachedClaim from lib/db/claim-cache
// TODO: import getClaimByEpisodeAndSentence, insertClaim from lib/db/claims
// TODO: import extractCoreClaim, classifyClaim, evaluateClaim from lib/openai/claim-pipeline
// TODO: import search from lib/search/serpapi

export type RunPipelineInput = {
  episodeId?: string;
  sentenceId?: string;
  selectedText: string;
  userId?: string | null;
};

export async function runPipeline(input: RunPipelineInput): Promise<ClaimResult> {
  const normalized = normalizeClaimInput(input.selectedText);
  const hash = normalizedClaimHash(normalized);

  // TODO: 1) Check cache by (episodeId + sentenceId) or (episodeId + selectedText hash)
  // TODO: 2) Check global cache by hash
  // TODO: 3) extractCoreClaim(normalized)
  // TODO: 4) classifyClaim(coreClaim)
  // TODO: 5) generate search queries, call search(), get top N
  // TODO: 6) evaluateClaim(coreClaim, claimType, searchResults)
  // TODO: 7) insertClaim(...), setCachedClaim(hash, normalized, result)
  // TODO: 8) return result

  return {
    claimClassification: "",
    accuracyPercentage: 0,
    contextSummary: "",
    supportingEvidence: [],
    contradictingEvidence: [],
    confidenceScore: 0,
    sources: [],
  };
}

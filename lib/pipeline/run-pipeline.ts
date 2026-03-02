/**
 * Full fact-check pipeline: normalize → cache check → extract → classify → search → evaluate → persist.
 * See project.md §5.1.
 */
import type { ClaimResult } from "@/types/claim";
import { normalizeClaimInput, normalizedClaimHash } from "./normalize";
import { getCachedClaim, setCachedClaim } from "@/lib/db/claim-cache";
import { getClaimByEpisodeAndSentence, insertClaim } from "@/lib/db/claims";
import {
  extractCoreClaim,
  classifyClaim,
  evaluateClaim,
  type SearchResultItem,
} from "@/lib/openai/claim-pipeline";
import { search } from "@/lib/search/serpapi";

const MAX_SEARCH_RESULTS = Number(process.env.MAX_SEARCH_RESULTS) || 6;

export type RunPipelineInput = {
  episodeId?: string;
  sentenceId?: string;
  selectedText: string;
  userId?: string | null;
};

export async function runPipeline(input: RunPipelineInput): Promise<ClaimResult> {
  const normalized = normalizeClaimInput(input.selectedText);
  const hash = normalizedClaimHash(normalized);

  // 1) Episode-scoped cache: same episode + sentence
  if (input.episodeId && input.sentenceId) {
    const cached = await getClaimByEpisodeAndSentence(
      input.episodeId,
      input.sentenceId
    );
    if (cached) return cached;
  }

  // 2) Global cache by normalized claim hash
  const globalCached = await getCachedClaim(hash);
  if (globalCached) return globalCached;

  // 3) Extract core claim
  const coreClaim = await extractCoreClaim(normalized);

  // 4) Classify
  const claimType = await classifyClaim(coreClaim);

  // 5) Search: one query from core claim; merge and dedupe by URL
  const rawResults = await search(coreClaim);
  const seen = new Set<string>();
  const searchResults: SearchResultItem[] = [];
  for (const r of rawResults) {
    const url = r.link;
    if (!seen.has(url)) {
      seen.add(url);
      searchResults.push({ title: r.title, snippet: r.snippet, url: r.link });
      if (searchResults.length >= MAX_SEARCH_RESULTS) break;
    }
  }

  // 6) Evaluate
  const result = await evaluateClaim(coreClaim, claimType, searchResults);

  // 7) Persist: claim_cache always; claims only when we have a valid episode
  await setCachedClaim(hash, normalized, result);

  if (input.episodeId) {
    try {
      await insertClaim({
        episode_id: input.episodeId,
        sentence_id: input.sentenceId ?? null,
        selected_text: normalized,
        classification: result.claimClassification,
        accuracy_percentage: result.accuracyPercentage,
        context_summary: result.contextSummary,
        supporting_evidence: result.supportingEvidence,
        contradicting_evidence: result.contradictingEvidence,
        confidence_score: result.confidenceScore,
        sources: result.sources,
        ...(input.userId != null && { user_id: input.userId }),
      });
    } catch {
      // FK or other error: episode may not exist; still return result and cache
    }
  }

  return result;
}

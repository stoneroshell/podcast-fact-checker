/**
 * Full fact-check pipeline: source-hierarchy v1.
 * normalize → cache → structured extraction → multi-query search → tier filter → evaluate → confidence (code) → persist.
 * See project.md §5.1, source-hierarchy.md.
 */
import type { ClaimResult, SourceWithTier } from "@/types/claim";
import { normalizeClaimInput, normalizedClaimHash } from "./normalize";
import { getCachedClaim, setCachedClaim } from "@/lib/db/claim-cache";
import { getClaimByEpisodeAndSentence, insertClaim } from "@/lib/db/claims";
import {
  extractStructuredClaim,
  evaluateClaim,
  buildInsufficientEvidenceResult,
} from "@/lib/openai/claim-pipeline";
import { search } from "@/lib/search/serpapi";
import { getTierFromUrl } from "@/lib/authority/domain-to-tier";
import { computeConfidence } from "./confidence";

const MAX_SEARCH_RESULTS_AFTER_MERGE = Number(process.env.MAX_SEARCH_RESULTS) || 15;

export type RunPipelineInput = {
  episodeId?: string;
  sentenceId?: string;
  selectedText: string;
  userId?: string | null;
};

type RawSearchItem = { title: string; snippet: string; link: string };

function mergeAndDedupeByUrl(arrays: RawSearchItem[][]): RawSearchItem[] {
  const seen = new Set<string>();
  const out: RawSearchItem[] = [];
  for (const arr of arrays) {
    for (const r of arr) {
      const url = r.link;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(r);
      if (out.length >= MAX_SEARCH_RESULTS_AFTER_MERGE) return out;
    }
  }
  return out;
}

export async function runPipeline(input: RunPipelineInput): Promise<ClaimResult> {
  const normalized = normalizeClaimInput(input.selectedText);
  const hash = normalizedClaimHash(normalized);

  if (input.episodeId && input.sentenceId) {
    const cached = await getClaimByEpisodeAndSentence(
      input.episodeId,
      input.sentenceId
    );
    if (cached) return cached;
  }

  const globalCached = await getCachedClaim(hash);
  if (globalCached) return globalCached;

  const structured = await extractStructuredClaim(normalized);
  const { assertion, claimType, domain } = structured;

  const [results1, results2, results3] = await Promise.all([
    search(assertion),
    search(`${assertion} site:gov OR site:edu`),
    search(`${assertion} fact check`),
  ]);

  const merged = mergeAndDedupeByUrl([results1, results2, results3]);

  const withTier: (RawSearchItem & { tier: ReturnType<typeof getTierFromUrl> })[] = merged.map(
    (r) => ({ ...r, tier: getTierFromUrl(r.link) })
  );

  const noTier6 = withTier.filter((r) => r.tier !== 6);
  noTier6.sort((a, b) => b.tier - a.tier);

  const strongCount = noTier6.filter((r) => r.tier >= 3).length;

  if (strongCount < 2) {
    const sourcesUsed: SourceWithTier[] = noTier6.slice(0, 8).map((r) => ({
      url: r.link,
      title: r.title,
      snippet: r.snippet,
      tier: r.tier as 1 | 2 | 3 | 4 | 5,
    }));
    const result = buildInsufficientEvidenceResult(claimType, sourcesUsed, 0);
    await setCachedClaim(hash, normalized, result);
    if (input.episodeId) {
      try {
        const sourcesWithTierForDb = result.sources.map((s, i) => ({
          ...s,
          tier: result.sourcesUsed[i]?.tier ?? 4,
        }));
        await insertClaim({
          episode_id: input.episodeId,
          sentence_id: input.sentenceId ?? null,
          selected_text: normalized,
          classification: result.claimClassification,
          accuracy_percentage: result.accuracyPercentage,
          context_summary: result.contextSummary,
          supporting_evidence: result.supportingEvidence,
          contradicting_evidence: result.contradictingEvidence,
          confidence_score: result.confidence,
          sources: sourcesWithTierForDb,
          verdict: result.verdict,
          ...(input.userId != null && { user_id: input.userId }),
        });
      } catch {
        // ignore
      }
    }
    return result;
  }

  const tier3Plus = noTier6.filter((r) => r.tier >= 3);
  const sourcesForEval: SourceWithTier[] = tier3Plus.slice(0, 8).map((r) => ({
    url: r.link,
    title: r.title,
    snippet: r.snippet,
    tier: r.tier as 1 | 2 | 3 | 4 | 5,
  }));

  const result = await evaluateClaim(assertion, claimType, domain, sourcesForEval);
  result.confidence = computeConfidence(result.sourcesUsed, result.verdict);
  result.confidenceScore = result.confidence;

  await setCachedClaim(hash, normalized, result);

  if (input.episodeId) {
    try {
      const sourcesWithTierForDb = result.sources.map((s, i) => ({
        ...s,
        tier: result.sourcesUsed[i]?.tier ?? 4,
      }));
      await insertClaim({
        episode_id: input.episodeId,
        sentence_id: input.sentenceId ?? null,
        selected_text: normalized,
        classification: result.claimClassification,
        accuracy_percentage: result.accuracyPercentage,
        context_summary: result.contextSummary,
        supporting_evidence: result.supportingEvidence,
        contradicting_evidence: result.contradictingEvidence,
        confidence_score: result.confidence,
        sources: sourcesWithTierForDb,
        verdict: result.verdict,
        ...(input.userId != null && { user_id: input.userId }),
      });
    } catch {
      // ignore
    }
  }

  return result;
}

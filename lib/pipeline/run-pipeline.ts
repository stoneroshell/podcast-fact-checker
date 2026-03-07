/**
 * Full fact-check pipeline: source-hierarchy v1.
 * normalize → cache → structured extraction → query diversification → multi-query search → tier filter → evaluate → clusters (support/contradict/context) → weighted consensus → confidence (code) → persist.
 * See project.md §5.1, source-hierarchy.md.
 */
import type { ClaimResult, SourceWithTier } from "@/types/claim";
import { normalizeClaimInput, normalizedClaimHash } from "./normalize";
import { getCachedClaim, setCachedClaim } from "@/lib/db/claim-cache";
import { getClaimByEpisodeAndSentence, insertClaim } from "@/lib/db/claims";
import {
  extractStructuredClaim,
  generateVerificationQueries,
  evaluateClaim,
  buildInsufficientEvidenceResult,
} from "@/lib/openai/claim-pipeline";
import { search } from "@/lib/search/serpapi";
import { getTierFromUrl } from "@/lib/authority/domain-to-tier";
import { computeConfidence } from "./confidence";
import {
  computeWeightedConsensus,
  computeConsensusFromClusters,
  consensusToVerdict,
} from "./consensus";
import { getSourceWeight } from "./source-weight";
import { getAccuracyLabel } from "./accuracy-rubric";

const MAX_SEARCH_RESULTS_AFTER_MERGE = Number(process.env.MAX_SEARCH_RESULTS) || 15;

export type RunPipelineInput = {
  episodeId?: string;
  sentenceId?: string;
  selectedText: string;
  userId?: string | null;
  /** When true, skip episode and global caches and always run the pipeline (for testing or refresh). */
  forceRefresh?: boolean;
};

type RawSearchItem = { title: string; snippet: string; link: string };

type MergedItem = RawSearchItem & { fromFactCheckQuery: boolean };

/**
 * Merge multiple result arrays by URL; dedupe and cap at MAX_SEARCH_RESULTS_AFTER_MERGE.
 * fromFactCheckQuery is true for any URL that appeared in a result array at an index in factCheckIndices.
 */
function mergeAndDedupeByUrl(
  resultArrays: RawSearchItem[][],
  factCheckIndices: Set<number>
): MergedItem[] {
  const seen = new Map<string, number>();
  const out: MergedItem[] = [];
  for (let idx = 0; idx < resultArrays.length; idx++) {
    const arr = resultArrays[idx];
    const isFactCheck = factCheckIndices.has(idx);
    for (const r of arr) {
      const url = r.link;
      if (!url) continue;
      const existing = seen.get(url);
      if (existing !== undefined) {
        if (isFactCheck) out[existing].fromFactCheckQuery = true;
        continue;
      }
      seen.set(url, out.length);
      out.push({
        ...r,
        fromFactCheckQuery: isFactCheck,
      });
      if (out.length >= MAX_SEARCH_RESULTS_AFTER_MERGE) return out;
    }
  }
  return out;
}

export async function runPipeline(input: RunPipelineInput): Promise<ClaimResult> {
  const normalized = normalizeClaimInput(input.selectedText);
  const hash = normalizedClaimHash(normalized);

  if (!input.forceRefresh) {
    if (input.episodeId && input.sentenceId) {
      const cached = await getClaimByEpisodeAndSentence(
        input.episodeId,
        input.sentenceId
      );
      if (cached) return cached;
    }

    const globalCached = await getCachedClaim(hash);
    if (globalCached) return globalCached;
  }

  const structured = await extractStructuredClaim(normalized);
  const { assertion, claimType, domain } = structured;

  const verificationQueries = await generateVerificationQueries(assertion);
  const authorityQueries = [
    `${assertion} site:gov OR site:edu`,
    `${assertion} fact check`,
  ];
  const allQueries = [...verificationQueries, ...authorityQueries];
  const factCheckIndex = allQueries.length - 1;
  const resultArrays = await Promise.all(allQueries.map((q) => search(q)));
  const merged = mergeAndDedupeByUrl(
    resultArrays,
    new Set([factCheckIndex])
  );

  const withTier: (MergedItem & { tier: ReturnType<typeof getTierFromUrl> })[] = merged.map(
    (r) => ({
      ...r,
      tier: getTierFromUrl(r.link),
    })
  );

  const noTier6 = withTier.filter((r) => r.tier !== 6);
  // Tier scale: 1 = highest authority, 6 = lowest. Strong = tier 1, 2, or 3 (tier <= 3).
  noTier6.sort((a, b) => a.tier - b.tier);

  const strongCount = noTier6.filter((r) => r.tier <= 3).length;

  if (strongCount < 2) {
    const sourcesUsed: SourceWithTier[] = noTier6.slice(0, 8).map((r) => {
      const tier = r.tier as 1 | 2 | 3 | 4 | 5;
      return {
        url: r.link,
        title: r.title,
        snippet: r.snippet,
        tier,
        weight: getSourceWeight(tier, r.fromFactCheckQuery),
        fromFactCheckQuery: r.fromFactCheckQuery,
      };
    });
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
          neutral_evidence: result.neutralEvidence ?? [],
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

  const strongSources = noTier6.filter((r) => r.tier <= 3);
  const sourcesForEval: SourceWithTier[] = strongSources.slice(0, 8).map((r) => {
    const tier = r.tier as 1 | 2 | 3 | 4 | 5;
    return {
      url: r.link,
      title: r.title,
      snippet: r.snippet,
      tier,
      weight: getSourceWeight(tier, r.fromFactCheckQuery),
      fromFactCheckQuery: r.fromFactCheckQuery,
    };
  });

  const today = new Date().toISOString().split("T")[0];
  const result = await evaluateClaim(assertion, claimType, domain, sourcesForEval, { today });

  const supportIds = result.supportingEvidence.map((e) => e.sourceId);
  const contradictIds = result.contradictingEvidence.map((e) => e.sourceId);
  const contextIds = (result.neutralEvidence ?? []).map((e) => e.sourceId);
  const weightBySourceId: Record<string, number> = {};
  result.sourcesUsed.forEach((s, i) => {
    const id = `s${i + 1}`;
    weightBySourceId[id] = s.weight ?? getSourceWeight(s.tier, s.fromFactCheckQuery);
  });

  /*
   * Certainty outputs (kept coherent):
   * - consensusScore: 0–100, deterministic. Weighted support/(support+contradict) from evidence
   *   clusters. Drives verdict when we use consensusToVerdict. No support/contradict → null.
   * - accuracyScore / accuracyPercentage: 0–100. "How well does the claim hold?" When verdict is
   *   overridden from consensus, we set these to match the verdict so they don't contradict it.
   * - confidence: 0–100, deterministic. Reliability of the analysis (source quality + agreement).
   *   Takes consensusScore as input: high consensus cannot produce very low confidence; very low
   *   consensus caps confidence. Ensures we never return e.g. consensusScore 100 with confidence 50.
   *
   * Verdict semantics: Contested means sources disagree now (genuine dispute). Outdated means the
   * claim was historically well-supported but recent sources (e.g. within ~2 years) contradict it
   * due to a time-sensitive factual shift — the world changed, not a standing disagreement.
   */

  const consensus = computeConsensusFromClusters(
    supportIds,
    contradictIds,
    contextIds,
    weightBySourceId
  );
  if (consensus !== null) {
    result.consensusScore = consensus;
    const verdictFromConsensus = consensusToVerdict(consensus);
    if (verdictFromConsensus !== null) {
      result.verdict = verdictFromConsensus;
      const score =
        verdictFromConsensus === "True" ? 88 : verdictFromConsensus === "False" ? 12 : 50;
      result.accuracyScore = score;
      result.accuracyPercentage = score;
      result.accuracyLabel = getAccuracyLabel(score);
    }
  }

  const disputedByFactCheck =
    result.contradictingEvidence.some((e) => {
      const idx = result.sources.findIndex((s) => s.id === e.sourceId);
      const src = result.sourcesUsed[idx];
      return src?.fromFactCheckQuery && src.tier <= 3;
    });
  if (disputedByFactCheck && result.verdict === "True") {
    result.verdict = "Contested";
    result.accuracyScore = 50;
    result.accuracyPercentage = 50;
    result.accuracyLabel = getAccuracyLabel(50);
  }

  const needsHighAuthorityBar =
    (structured.containsSuperlative || structured.requiresHighAuthority) &&
    result.verdict === "True";
  if (needsHighAuthorityBar) {
    let tier2Supporting = 0;
    let tier3Supporting = 0;
    for (const id of supportIds) {
      const idx = result.sources.findIndex((s) => s.id === id);
      const src = result.sourcesUsed[idx];
      if (src) {
        if (src.tier === 2) tier2Supporting++;
        if (src.tier === 3) tier3Supporting++;
      }
    }
    const meetsBar =
      (consensus !== null && consensus > 85) ||
      tier2Supporting >= 1 ||
      tier3Supporting >= 2;
    if (!meetsBar) {
      result.verdict = "Contested";
      result.accuracyScore = 50;
      result.accuracyPercentage = 50;
      result.accuracyLabel = getAccuracyLabel(50);
    }
  }

  const supporting = result.supportingEvidence.length;
  const contradicting = result.contradictingEvidence.length;
  const neutral = result.neutralEvidence?.length ?? 0;
  const supportingWeight = supportIds.reduce((s, id) => s + (weightBySourceId[id] ?? 0), 0);
  const contradictingWeight = contradictIds.reduce(
    (s, id) => s + (weightBySourceId[id] ?? 0),
    0
  );

  let confidence = computeConfidence(
    result.sourcesUsed,
    result.verdict,
    {
      supporting,
      contradicting,
      neutral,
      supportingWeight,
      contradictingWeight,
    },
    result.consensusScore ?? consensus ?? undefined
  );
  const nonFactualTypes = ["opinion", "value_judgment", "prediction", "rhetorical_statement"];
  if (nonFactualTypes.includes(claimType)) confidence = Math.min(confidence, 50);
  if (disputedByFactCheck) confidence = Math.min(confidence, 50);
  result.confidence = confidence;
  result.confidenceScore = confidence;

  // Coherence check: a definitive True/False verdict with low confidence is internally contradictory
  // and misleading — we should not present a binary conclusion when we're not confident in it.
  if (confidence < 55 && (result.verdict === "True" || result.verdict === "False")) {
    result.verdict = "Contested";
    result.accuracyScore = 50;
    result.accuracyPercentage = 50;
    result.accuracyLabel = getAccuracyLabel(50);
  }

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
        neutral_evidence: result.neutralEvidence ?? [],
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

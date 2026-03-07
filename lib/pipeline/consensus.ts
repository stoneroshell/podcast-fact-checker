/**
 * Consensus score and verdict-from-consensus for source-driven fact-checking.
 * Consensus = supporting / (supporting + contradicting) as percentage.
 * Verdict bands: >70% True, 40–70% Contested, <40% False.
 *
 * Evidence is clustered by claim stance: support, contradict, context (neutral).
 * Consensus is computed from cluster-level weights (support vs contradict only; context is not used in the ratio).
 */
import type { ClaimVerdict } from "@/types/claim";

/**
 * Compute consensus from explicit support / contradict / context clusters.
 * Context cluster is not used in the ratio; only support and contradict weights determine consensus.
 * Returns null when both support and contradict weight sums are 0.
 */
export function computeConsensusFromClusters(
  supportIds: string[],
  contradictIds: string[],
  _contextIds: string[],
  weightBySourceId: Record<string, number>
): number | null {
  return computeWeightedConsensus(supportIds, contradictIds, weightBySourceId);
}

/**
 * Compute consensus percentage from evidence counts.
 * Returns null when there are no supporting or contradicting sources (only neutral).
 */
export function computeConsensus(
  supporting: number,
  contradicting: number
): number | null {
  const total = supporting + contradicting;
  if (total === 0) return null;
  return Math.round((supporting / total) * 100);
}

/**
 * Weighted consensus: supportingWeight / (supportingWeight + contradictingWeight).
 * Uses per-source weights so high-tier and fact-check sources matter more.
 * Returns null when both weight sums are 0.
 */
export function computeWeightedConsensus(
  supportingIds: string[],
  contradictingIds: string[],
  weightBySourceId: Record<string, number>
): number | null {
  const supportingWeight = supportingIds.reduce((sum, id) => sum + (weightBySourceId[id] ?? 0), 0);
  const contradictingWeight = contradictingIds.reduce(
    (sum, id) => sum + (weightBySourceId[id] ?? 0),
    0
  );
  const total = supportingWeight + contradictingWeight;
  if (total === 0) return null;
  return Math.round((supportingWeight / total) * 100);
}

/**
 * Map consensus percentage to verdict (source-driven bands).
 * When consensus is null, returns null so caller can keep LLM verdict.
 */
export function consensusToVerdict(consensus: number | null): ClaimVerdict | null {
  if (consensus === null) return null;
  if (consensus > 70) return "True";
  if (consensus >= 40) return "Contested";
  return "False";
}

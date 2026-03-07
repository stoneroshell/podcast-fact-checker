/**
 * Per-source weight for weighted consensus.
 * Tier base + optional bonus for fact-check-query results.
 */

const TIER_WEIGHT: Record<number, number> = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
};

const FACT_CHECK_BONUS = 1;

/**
 * Numeric weight for a source (tier + optional fact-check bonus).
 * Used for weighted consensus so high-tier and fact-check sources matter more.
 */
export function getSourceWeight(
  tier: 1 | 2 | 3 | 4 | 5,
  fromFactCheckQuery?: boolean
): number {
  const base = TIER_WEIGHT[tier] ?? 2;
  return base + (fromFactCheckQuery ? FACT_CHECK_BONUS : 0);
}

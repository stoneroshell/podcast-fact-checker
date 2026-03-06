/**
 * Consensus score and verdict-from-consensus for source-driven fact-checking.
 * Consensus = supporting / (supporting + contradicting) as percentage.
 * Verdict bands: >70% True, 40–70% Contested, <40% False.
 */
import type { ClaimVerdict } from "@/types/claim";

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
 * Map consensus percentage to verdict (source-driven bands).
 * When consensus is null, returns null so caller can keep LLM verdict.
 */
export function consensusToVerdict(consensus: number | null): ClaimVerdict | null {
  if (consensus === null) return null;
  if (consensus > 70) return "True";
  if (consensus >= 40) return "Contested";
  return "False";
}

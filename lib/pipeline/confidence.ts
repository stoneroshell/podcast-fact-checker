/**
 * Deterministic confidence from source mix, verdict, and evidence agreement.
 * See source-hierarchy.md v1 Step 5; confidence is computed in code, not by LLM.
 * High certainty that the claim is false (unanimous contradiction) should produce high confidence,
 * not low — consensusScore 0 with verdict False means sources agree the claim is wrong.
 */
import type { ClaimVerdict, SourceWithTier } from "@/types/claim";

export type EvidenceCounts = {
  supporting: number;
  contradicting: number;
  neutral?: number;
  /** When set, use weight-based agreement ratio instead of count-based (so high-tier contradiction reduces confidence more). */
  supportingWeight?: number;
  contradictingWeight?: number;
};

/**
 * Optional consensus score (0–100). When provided, confidence is kept coherent with it:
 * high consensus cannot yield very low confidence, and very low consensus caps confidence.
 */
export function computeConfidence(
  sourcesUsed: SourceWithTier[],
  verdict: ClaimVerdict,
  evidenceCounts?: EvidenceCounts,
  consensusScore?: number | null
): number {
  let base = baseConfidence(sourcesUsed);
  if (verdict === "Contested" || verdict === "Outdated") base = Math.min(60, base);

  if (evidenceCounts) {
    const totalCount = evidenceCounts.supporting + evidenceCounts.contradicting;
    const totalWeight =
      (evidenceCounts.supportingWeight ?? 0) + (evidenceCounts.contradictingWeight ?? 0);
    const useWeights =
      totalWeight > 0 &&
      evidenceCounts.supportingWeight != null &&
      evidenceCounts.contradictingWeight != null;
    const agreementRatio =
      useWeights
        ? evidenceCounts.supportingWeight! / totalWeight
        : totalCount > 0
          ? evidenceCounts.supporting / totalCount
          : null;
    if (agreementRatio !== null) {
      if (agreementRatio >= 0.7) {
        base = Math.min(100, base + 5);
      } else if (agreementRatio <= 0.3) {
        if (verdict === "False" && totalWeight > 0) {
          const contradictWeight = evidenceCounts.contradictingWeight ?? 0;
          if (contradictWeight >= totalWeight * 0.9) {
            base = Math.max(base, 75);
          } else {
            base = Math.min(base, 55);
          }
        } else {
          base = Math.min(base, 55);
        }
      } else {
        base = Math.min(base, 65);
      }
    }
  }

  let out = Math.max(0, Math.min(100, base));

  if (consensusScore != null && Number.isFinite(consensusScore)) {
    const c = Math.max(0, Math.min(100, Math.round(consensusScore)));
    if (c >= 90) out = Math.max(out, 60);
    else if (c <= 10) {
      if (verdict === "False") {
        out = Math.max(out, 70);
      } else {
        out = Math.min(out, 55);
      }
    }
  }

  return out;
}

function baseConfidence(sources: SourceWithTier[]): number {
  if (sources.length === 0) return 0;
  const tiers = sources.map((s) => s.tier);
  const hasTier1Or2 = tiers.some((t) => t === 1 || t === 2);
  const tier3Count = tiers.filter((t) => t === 3).length;
  const tier1Or2Count = tiers.filter((t) => t === 1 || t === 2).length;

  // 1× Tier 1 or 2 + 1× Tier 3 → 85–95
  if (hasTier1Or2 && tier3Count >= 1) return 90;
  // 1× Tier 1 or 2 + 2× Tier 3 → 80–90
  if (tier1Or2Count >= 1 && tier3Count >= 2) return 85;
  // 2× Tier 3 → 65–75
  if (tier3Count >= 2) return 70;
  // 1× Tier 1 or 2 only
  if (hasTier1Or2) return 80;
  // 1× Tier 3 only
  if (tier3Count >= 1) return 60;
  // Tier 4 only (fallback)
  return 45;
}

/**
 * Deterministic confidence from source mix, verdict, and evidence agreement.
 * See source-hierarchy.md v1 Step 5; confidence is computed in code, not by LLM.
 */
import type { ClaimVerdict, SourceWithTier } from "@/types/claim";

export type EvidenceCounts = {
  supporting: number;
  contradicting: number;
  neutral?: number;
};

export function computeConfidence(
  sourcesUsed: SourceWithTier[],
  verdict: ClaimVerdict,
  evidenceCounts?: EvidenceCounts
): number {
  let base = baseConfidence(sourcesUsed);
  if (verdict === "Contested") base = Math.min(60, base);

  if (evidenceCounts && evidenceCounts.supporting + evidenceCounts.contradicting > 0) {
    const total = evidenceCounts.supporting + evidenceCounts.contradicting;
    const agreementRatio = evidenceCounts.supporting / total;
    if (agreementRatio >= 0.7) {
      // High agreement: keep or slight boost
      base = Math.min(100, base + 5);
    } else if (agreementRatio <= 0.3) {
      // Low agreement (mostly contradicting): cap
      base = Math.min(base, 55);
    } else {
      // Split evidence: cap
      base = Math.min(base, 65);
    }
  }

  return Math.max(0, Math.min(100, base));
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

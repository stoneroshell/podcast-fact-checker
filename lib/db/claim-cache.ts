/**
 * Claim cache (global reuse by normalized claim hash).
 * See project.md §4.2 (claim_cache), §5.6. Normalizes to v1 ClaimResult shape for backward compat.
 */
import { supabase } from "./client";
import type { ClaimResult, SourceWithTier } from "@/types/claim";

function normalizeCachedResult(raw: unknown): ClaimResult {
  const r = raw as Record<string, unknown>;
  const sources = Array.isArray(r.sources) ? (r.sources as ClaimResult["sources"]) : [];
  const sourcesUsed: SourceWithTier[] = Array.isArray(r.sourcesUsed)
    ? (r.sourcesUsed as SourceWithTier[])
    : sources.map((s) => {
        const rec = s as unknown as { tier?: number };
        const tier = rec.tier != null && rec.tier >= 1 && rec.tier <= 5 ? rec.tier : 4;
        return { url: s.url, title: s.title, snippet: s.snippet, tier: tier as 1 | 2 | 3 | 4 | 5 };
      });
  const verdict = (r.verdict as ClaimResult["verdict"]) ?? "Insufficient Evidence";
  const validVerdicts = ["True", "False", "Misleading", "Contested", "Insufficient Evidence"];
  const verdictNorm = validVerdicts.includes(String(verdict)) ? verdict : "Insufficient Evidence";
  return {
    verdict: verdictNorm,
    evidenceSummary: String(r.evidenceSummary ?? r.contextSummary ?? ""),
    sourcesUsed,
    confidence: Number(r.confidence ?? r.confidenceScore ?? 0),
    claimClassification: String(r.claimClassification ?? r.classification ?? ""),
    accuracyPercentage: Number(r.accuracyPercentage ?? 0),
    contextSummary: String(r.contextSummary ?? r.evidenceSummary ?? ""),
    supportingEvidence: Array.isArray(r.supportingEvidence) ? (r.supportingEvidence as ClaimResult["supportingEvidence"]) : [],
    contradictingEvidence: Array.isArray(r.contradictingEvidence) ? (r.contradictingEvidence as ClaimResult["contradictingEvidence"]) : [],
    confidenceScore: Number(r.confidenceScore ?? r.confidence ?? 0),
    sources,
    uncertaintyNote: r.uncertaintyNote != null ? String(r.uncertaintyNote) : undefined,
  };
}

export async function getCachedClaim(
  normalizedClaimHash: string
): Promise<ClaimResult | null> {
  const { data, error } = await supabase
    .from("claim_cache")
    .select("result_json")
    .eq("normalized_claim_hash", normalizedClaimHash)
    .maybeSingle();

  if (error || !data?.result_json) return null;
  return normalizeCachedResult(data.result_json);
}

export async function setCachedClaim(
  normalizedClaimHash: string,
  normalizedClaimText: string,
  result: ClaimResult
): Promise<void> {
  await supabase.from("claim_cache").upsert(
    {
      normalized_claim_hash: normalizedClaimHash,
      normalized_claim_text: normalizedClaimText,
      result_json: result,
    },
    { onConflict: "normalized_claim_hash" }
  );
}

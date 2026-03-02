/**
 * Claim cache (global reuse by normalized claim hash).
 * See project.md §4.2 (claim_cache), §5.6.
 */
import { supabase } from "./client";
import type { ClaimResult } from "@/types/claim";

export async function getCachedClaim(
  normalizedClaimHash: string
): Promise<ClaimResult | null> {
  const { data, error } = await supabase
    .from("claim_cache")
    .select("result_json")
    .eq("normalized_claim_hash", normalizedClaimHash)
    .maybeSingle();

  if (error || !data?.result_json) return null;
  return data.result_json as ClaimResult;
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

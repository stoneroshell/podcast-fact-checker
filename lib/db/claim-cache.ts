/**
 * Claim cache (global reuse by normalized claim hash).
 * See project.md §4.2 (claim_cache), §5.6.
 */
import { supabase } from "./client";
import type { ClaimResult } from "@/types/claim";

export async function getCachedClaim(normalizedClaimHash: string): Promise<ClaimResult | null> {
  // TODO: supabase.from("claim_cache").select("result_json").eq("normalized_claim_hash", hash).single()
  return null;
}

export async function setCachedClaim(
  normalizedClaimHash: string,
  normalizedClaimText: string,
  result: ClaimResult
): Promise<void> {
  // TODO: supabase.from("claim_cache").upsert({ normalized_claim_hash, normalized_claim_text, result_json: result })
}

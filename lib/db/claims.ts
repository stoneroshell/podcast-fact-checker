/**
 * Claims DB operations: insert claim, get by episode/sentence.
 * See project.md §4.2 (claims table).
 */
import { supabase } from "./client";
import type { ClaimResult } from "@/types/claim";

type ClaimRow = {
  episode_id: string;
  sentence_id: string | null;
  selected_text: string;
  user_id?: string | null;
} & Omit<ClaimResult, "claimClassification"> & { classification: string };

export async function insertClaim(row: ClaimRow): Promise<string | null> {
  // TODO: supabase.from("claims").insert({ ... }).select("id").single()
  return null;
}

export async function getClaimByEpisodeAndSentence(
  episodeId: string,
  sentenceId: string
): Promise<ClaimResult | null> {
  // TODO: fetch existing claim for cache hit path
  return null;
}

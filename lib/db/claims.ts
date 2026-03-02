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
  classification: string;
  accuracy_percentage: number;
  context_summary: string;
  supporting_evidence: ClaimResult["supportingEvidence"];
  contradicting_evidence: ClaimResult["contradictingEvidence"];
  confidence_score: number;
  sources: ClaimResult["sources"];
  user_id?: string | null;
};

function rowToClaimResult(row: Record<string, unknown>): ClaimResult {
  return {
    claimClassification: String(row.classification ?? ""),
    accuracyPercentage: Number(row.accuracy_percentage ?? 0),
    contextSummary: String(row.context_summary ?? ""),
    supportingEvidence: Array.isArray(row.supporting_evidence)
      ? (row.supporting_evidence as ClaimResult["supportingEvidence"])
      : [],
    contradictingEvidence: Array.isArray(row.contradicting_evidence)
      ? (row.contradicting_evidence as ClaimResult["contradictingEvidence"])
      : [],
    confidenceScore: Number(row.confidence_score ?? 0),
    sources: Array.isArray(row.sources) ? (row.sources as ClaimResult["sources"]) : [],
  };
}

export async function insertClaim(row: ClaimRow): Promise<string | null> {
  const { data, error } = await supabase
    .from("claims")
    .insert({
      episode_id: row.episode_id,
      sentence_id: row.sentence_id,
      selected_text: row.selected_text,
      classification: row.classification,
      accuracy_percentage: row.accuracy_percentage,
      context_summary: row.context_summary,
      supporting_evidence: row.supporting_evidence,
      contradicting_evidence: row.contradicting_evidence,
      confidence_score: row.confidence_score,
      sources: row.sources,
      ...(row.user_id != null && { user_id: row.user_id }),
    })
    .select("id")
    .single();

  if (error || !data?.id) return null;
  return data.id as string;
}

export async function getClaimByEpisodeAndSentence(
  episodeId: string,
  sentenceId: string
): Promise<ClaimResult | null> {
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .eq("episode_id", episodeId)
    .eq("sentence_id", sentenceId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToClaimResult(data);
}

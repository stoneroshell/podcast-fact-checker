/**
 * Claims DB operations: insert claim, get by episode/sentence.
 * See project.md §4.2 (claims table), source-hierarchy v1.
 */
import { supabase } from "./client";
import type { ClaimResult, ClaimEvidenceItem, SourceWithTier } from "@/types/claim";
import { getAccuracyLabel } from "@/lib/pipeline/accuracy-rubric";

type ClaimRow = {
  episode_id: string;
  sentence_id: string | null;
  selected_text: string;
  classification: string;
  accuracy_percentage: number;
  context_summary: string;
  supporting_evidence: ClaimResult["supportingEvidence"];
  contradicting_evidence: ClaimResult["contradictingEvidence"];
  neutral_evidence?: ClaimResult["neutralEvidence"];
  confidence_score: number;
  sources: ClaimResult["sources"];
  verdict?: string | null;
  user_id?: string | null;
};

function sourcesToSourcesUsed(sources: ClaimResult["sources"]): SourceWithTier[] {
  if (!Array.isArray(sources)) return [];
  return sources.map((s) => {
    const rec = s as unknown as { tier?: number };
    const tier = rec.tier != null && rec.tier >= 1 && rec.tier <= 5 ? rec.tier : 4;
    return { url: s.url, title: s.title, snippet: s.snippet, tier: tier as 1 | 2 | 3 | 4 | 5 };
  });
}

function rowToClaimResult(row: Record<string, unknown>): ClaimResult {
  const sources = Array.isArray(row.sources) ? (row.sources as ClaimResult["sources"]) : [];
  const contextSummary = String(row.context_summary ?? "");
  const confidence = Number(row.confidence_score ?? 0);
  const verdict = String(row.verdict ?? "Insufficient Evidence") as ClaimResult["verdict"];
  const accuracyScore = Number(row.accuracy_percentage ?? 0);
  return {
    verdict: ["True", "False", "Misleading", "Contested", "Insufficient Evidence"].includes(verdict)
      ? verdict
      : "Insufficient Evidence",
    accuracyScore,
    accuracyLabel: getAccuracyLabel(accuracyScore),
    evidenceSummary: contextSummary,
    sourcesUsed: sourcesToSourcesUsed(sources),
    confidence,
    claimClassification: String(row.classification ?? ""),
    accuracyPercentage: accuracyScore,
    contextSummary,
    supportingEvidence: Array.isArray(row.supporting_evidence)
      ? (row.supporting_evidence as ClaimResult["supportingEvidence"])
      : [],
    contradictingEvidence: Array.isArray(row.contradicting_evidence)
      ? (row.contradicting_evidence as ClaimResult["contradictingEvidence"])
      : [],
    neutralEvidence: Array.isArray(row.neutral_evidence) && (row.neutral_evidence as ClaimEvidenceItem[]).length > 0
      ? (row.neutral_evidence as ClaimEvidenceItem[])
      : undefined,
    confidenceScore: confidence,
    sources,
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
      neutral_evidence: row.neutral_evidence ?? [],
      confidence_score: row.confidence_score,
      sources: row.sources,
      ...(row.verdict != null && { verdict: row.verdict }),
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

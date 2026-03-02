/**
 * OpenAI claim pipeline: extract claim, classify, evaluate with structured output.
 * See project.md §5.1, §5.2.
 */
import OpenAI from "openai";
import type { ClaimResult } from "@/types/claim";
import {
  EXTRACT_CLAIM_SYSTEM,
  EXTRACT_CLAIM_USER,
  CLASSIFY_CLAIM_SYSTEM,
  CLASSIFY_CLAIM_USER,
  EVALUATE_CLAIM_SYSTEM,
  EVALUATE_CLAIM_USER,
} from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

const CLASSIFICATION_TOKENS = [
  "verifiable_factual_claim",
  "opinion",
  "prediction",
  "value_judgment",
  "rhetorical_statement",
] as const;

function normalizeClassification(raw: string): string {
  const lower = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const found = CLASSIFICATION_TOKENS.find((t) => lower === t || lower.startsWith(t));
  return found ?? "verifiable_factual_claim";
}

export async function extractCoreClaim(text: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: EXTRACT_CLAIM_SYSTEM },
      { role: "user", content: EXTRACT_CLAIM_USER(text) },
    ],
    max_tokens: 150,
  });
  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  return content || text;
}

export async function classifyClaim(text: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: CLASSIFY_CLAIM_SYSTEM },
      { role: "user", content: CLASSIFY_CLAIM_USER(text) },
    ],
    max_tokens: 30,
  });
  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  return normalizeClassification(content);
}

export type SearchResultItem = { title: string; snippet: string; url: string };

export async function evaluateClaim(
  coreClaim: string,
  claimType: string,
  searchResults: SearchResultItem[]
): Promise<ClaimResult> {
  const sourcesWithIds = searchResults.map((r, i) => ({
    id: `s${i + 1}`,
    url: r.url,
    title: r.title,
    snippet: r.snippet,
  }));
  const sourcesText = sourcesWithIds
    .map(
      (s) =>
        `[${s.id}] ${s.title}\n  URL: ${s.url}\n  Snippet: ${s.snippet}`
    )
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: EVALUATE_CLAIM_SYSTEM },
      {
        role: "user",
        content: EVALUATE_CLAIM_USER(coreClaim, claimType, sourcesText),
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
  });
  const content = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {
      claimClassification: claimType,
      accuracyPercentage: 0,
      contextSummary: "Evaluation could not be parsed.",
      supportingEvidence: [],
      contradictingEvidence: [],
      confidenceScore: 0,
      sources: sourcesWithIds,
    };
  }

  const byId = new Map(sourcesWithIds.map((s) => [s.id, s]));
  const sourcesFromModel = Array.isArray(parsed.sources)
    ? (parsed.sources as Array<{ id?: string; url?: string; title?: string; snippet?: string }>)
    : [];
  const sources: ClaimResult["sources"] = sourcesFromModel
    .filter((s) => s.id && byId.has(s.id))
    .map((s) => ({
      id: s.id!,
      url: byId.get(s.id!)!.url,
      title: byId.get(s.id!)!.title,
      snippet: byId.get(s.id!)!.snippet,
    }));

  return {
    claimClassification: claimType,
    accuracyPercentage: Number(parsed.accuracyPercentage) ?? 0,
    contextSummary: String(parsed.contextSummary ?? ""),
    supportingEvidence: Array.isArray(parsed.supportingEvidence)
      ? (parsed.supportingEvidence as ClaimResult["supportingEvidence"])
      : [],
    contradictingEvidence: Array.isArray(parsed.contradictingEvidence)
      ? (parsed.contradictingEvidence as ClaimResult["contradictingEvidence"])
      : [],
    confidenceScore: Number(parsed.confidenceScore) ?? 0,
    sources: sources.length > 0 ? sources : sourcesWithIds,
    uncertaintyNote:
      parsed.uncertaintyNote != null ? String(parsed.uncertaintyNote) : undefined,
  };
}

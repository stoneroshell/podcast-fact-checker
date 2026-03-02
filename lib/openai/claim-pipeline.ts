/**
 * OpenAI claim pipeline: extract claim, classify, evaluate with structured output.
 * See project.md §5.1, §5.2, source-hierarchy.md v1.
 */
import OpenAI from "openai";
import type { ClaimResult, SourceWithTier } from "@/types/claim";
import {
  EXTRACT_CLAIM_SYSTEM,
  EXTRACT_CLAIM_USER,
  EXTRACT_STRUCTURED_SYSTEM,
  EXTRACT_STRUCTURED_USER,
  CLASSIFY_CLAIM_SYSTEM,
  CLASSIFY_CLAIM_USER,
  EVALUATE_CLAIM_SYSTEM,
  EVALUATE_CLAIM_USER,
  EVALUATE_CLAIM_V1_SYSTEM,
  EVALUATE_CLAIM_V1_USER,
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

const DOMAIN_TOKENS = [
  "medical",
  "legal",
  "finance",
  "politics",
  "historical",
  "tech",
  "general",
] as const;

export type StructuredClaim = {
  assertion: string;
  entities?: string[];
  dateRange?: string | null;
  domain: string;
  claimType: string;
};

function normalizeClassification(raw: string): string {
  const lower = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const found = CLASSIFICATION_TOKENS.find((t) => lower === t || lower.startsWith(t));
  return found ?? "verifiable_factual_claim";
}

function normalizeDomain(raw: string): string {
  const lower = raw.trim().toLowerCase();
  const found = DOMAIN_TOKENS.find((t) => lower === t || lower.startsWith(t));
  return found ?? "general";
}

/** v1: One LLM call for assertion, domain, claimType, optional entities/dateRange */
export async function extractStructuredClaim(rawText: string): Promise<StructuredClaim> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: EXTRACT_STRUCTURED_SYSTEM },
      { role: "user", content: EXTRACT_STRUCTURED_USER(rawText) },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });
  const content = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {
      assertion: rawText,
      domain: "general",
      claimType: "verifiable_factual_claim",
    };
  }
  const assertion = String(parsed.assertion ?? rawText).trim() || rawText;
  const claimType = normalizeClassification(String(parsed.claimType ?? ""));
  const domain = normalizeDomain(String(parsed.domain ?? ""));
  const entities = Array.isArray(parsed.entities)
    ? (parsed.entities as string[]).filter((e) => typeof e === "string")
    : undefined;
  const dateRange =
    parsed.dateRange != null && parsed.dateRange !== ""
      ? String(parsed.dateRange)
      : undefined;
  return { assertion, entities, dateRange, domain, claimType };
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

const VERDICT_TOKENS = ["True", "False", "Misleading", "Contested", "Insufficient Evidence"] as const;

function normalizeVerdict(raw: string): ClaimResult["verdict"] {
  const t = raw.trim();
  const found = VERDICT_TOKENS.find((v) => t === v || t.toLowerCase() === v.toLowerCase());
  return found ?? "Insufficient Evidence";
}

function verdictToAccuracy(verdict: ClaimResult["verdict"]): number {
  switch (verdict) {
    case "True": return 90;
    case "False": return 10;
    case "Misleading": return 45;
    case "Contested": return 50;
    case "Insufficient Evidence": return 0;
    default: return 0;
  }
}

/** v1: Accepts sources with tier; returns verdict + evidenceSummary; confidence set by pipeline. */
export async function evaluateClaim(
  assertion: string,
  claimType: string,
  domain: string,
  sourcesWithTier: SourceWithTier[]
): Promise<ClaimResult> {
  const sourcesWithIds = sourcesWithTier.map((s, i) => ({
    id: `s${i + 1}`,
    ...s,
  }));
  const sourcesText = sourcesWithIds
    .map(
      (s) =>
        `[${s.id}] (Tier ${s.tier}) ${s.title ?? s.url}\n  URL: ${s.url}\n  Snippet: ${s.snippet ?? ""}`
    )
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: EVALUATE_CLAIM_V1_SYSTEM },
      {
        role: "user",
        content: EVALUATE_CLAIM_V1_USER(assertion, claimType, domain, sourcesText),
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 800,
  });
  const content = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return buildClaimResult(claimType, sourcesWithTier, "Insufficient Evidence", "Evaluation could not be parsed.", 0);
  }

  const verdict = normalizeVerdict(String(parsed.verdict ?? ""));
  const evidenceSummary = String(parsed.evidenceSummary ?? "").trim() || "No summary produced.";
  return buildClaimResult(claimType, sourcesWithTier, verdict, evidenceSummary, 0);
}

function buildClaimResult(
  claimType: string,
  sourcesWithTier: SourceWithTier[],
  verdict: ClaimResult["verdict"],
  evidenceSummary: string,
  confidence: number
): ClaimResult {
  const sources: ClaimResult["sources"] = sourcesWithTier.map((s, i) => ({
    id: `s${i + 1}`,
    url: s.url,
    title: s.title ?? "",
    snippet: s.snippet ?? "",
  }));
  return {
    verdict,
    evidenceSummary,
    sourcesUsed: sourcesWithTier,
    confidence,
    claimClassification: claimType,
    accuracyPercentage: verdictToAccuracy(verdict),
    contextSummary: evidenceSummary,
    supportingEvidence: [],
    contradictingEvidence: [],
    confidenceScore: confidence,
    sources,
  };
}

/** Build a ClaimResult for guardrail path (Insufficient Evidence, no evaluator call). */
export function buildInsufficientEvidenceResult(
  claimType: string,
  sourcesWithTier: SourceWithTier[],
  confidence: number
): ClaimResult {
  return buildClaimResult(
    claimType,
    sourcesWithTier,
    "Insufficient Evidence",
    "Fewer than 2 strong (Tier ≥3) sources; cannot reliably evaluate.",
    confidence
  );
}

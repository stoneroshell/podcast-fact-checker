/**
 * POST /api/claim/check
 * Body: { episodeId?, sentenceId?, selectedText } → run pipeline, return result + store claim.
 * See project.md §9.2, §5.
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Parse body: { episodeId?: string, sentenceId?: string, selectedText: string }
  // TODO: Optional: get userId from Supabase session for claims.user_id
  // TODO: Call lib/pipeline/run-pipeline (normalize → cache check → extract → classify → search → evaluate → persist)
  // TODO: Return structured result (ClaimResult type)
  const body = await request.json().catch(() => ({}));
  const { episodeId, sentenceId, selectedText } = body;

  if (!selectedText || typeof selectedText !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'selectedText' in body" },
      { status: 400 }
    );
  }

  // Placeholder response
  return NextResponse.json({
    claimClassification: "",
    accuracyPercentage: 0,
    contextSummary: "",
    supportingEvidence: [],
    contradictingEvidence: [],
    confidenceScore: 0,
    sources: [],
  });
}

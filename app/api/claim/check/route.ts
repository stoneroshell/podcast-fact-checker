/**
 * POST /api/claim/check
 * Body: { episodeId?, sentenceId?, selectedText } → run pipeline, return result + store claim.
 * See project.md §9.2, §5.
 */
import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/run-pipeline";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const episodeId =
    typeof obj.episodeId === "string" && obj.episodeId.trim()
      ? obj.episodeId.trim()
      : undefined;
  const sentenceId =
    typeof obj.sentenceId === "string" ? obj.sentenceId : undefined;
  const selectedText = typeof obj.selectedText === "string" ? obj.selectedText : "";
  const forceRefresh = obj.forceRefresh === true;

  if (!selectedText.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid 'selectedText' in body" },
      { status: 400 }
    );
  }

  try {
    const result = await runPipeline({
      episodeId,
      sentenceId,
      selectedText: selectedText.trim(),
      userId: null,
      forceRefresh,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[claim/check]", err);
    return NextResponse.json(
      { error: "Claim check failed. Please try again." },
      { status: 500 }
    );
  }
}

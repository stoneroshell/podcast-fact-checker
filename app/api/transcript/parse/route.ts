/**
 * POST /api/transcript/parse
 * Body: raw text or file → structured sentences.
 * See project.md §9.2.
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Accept JSON { text: string } or multipart file upload
  // TODO: Parse into array of { id, text, start_time: null, end_time: null }
  // TODO: Return { sentences: TranscriptSentence[] }
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Missing or empty 'text' in body" },
      { status: 400 }
    );
  }

  return NextResponse.json({ sentences: [] });
}

/**
 * GET /api/podcasts/episode/[id]
 * Episode by id; include transcript if present.
 * See project.md §9.2.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Fetch from DB (lib/db/episodes) or Podcast Index by episode id
  // TODO: Return episode + transcript_json, transcript_source
  if (!id) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  return NextResponse.json({ episode: null });
}

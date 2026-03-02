/**
 * GET /api/podcasts/search?q=
 * Query Podcast Index; return list for typeahead/selection.
 * See project.md §9.2.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  // TODO: Validate q, call Podcast Index API via lib/podcast-index/client
  // TODO: Return { results: Array<{ podcastId, title, imageUrl, ... }> }
  if (!q || q.trim() === "") {
    return NextResponse.json(
      { error: "Missing or empty query parameter 'q'" },
      { status: 400 }
    );
  }

  return NextResponse.json({ results: [] });
}

/**
 * GET /api/podcasts/search?q=
 * Query Podcast Index; return list for typeahead/selection.
 * See project.md §9.2, Chunk A §4.
 */
import { NextRequest, NextResponse } from "next/server";
import { searchPodcasts } from "@/lib/podcast-index/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q || q.trim() === "") {
    return NextResponse.json(
      { error: "Missing or empty query parameter 'q'" },
      { status: 400 }
    );
  }

  try {
    const results = await searchPodcasts(q.trim());
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[podcasts/search]", err);
    const message = err instanceof Error ? err.message : "Podcast search failed.";
    const status = message.includes("Missing required env") ? 503 : 502;
    return NextResponse.json(
      { error: "Search unavailable. Please try again later." },
      { status }
    );
  }
}

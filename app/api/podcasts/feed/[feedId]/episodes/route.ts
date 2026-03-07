/**
 * GET /api/podcasts/feed/[feedId]/episodes
 * List episodes for a feed (podcast). Use feedId from search results.
 * See project.md Chunk A §5.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEpisodesByFeedId } from "@/lib/podcast-index/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ feedId: string }> }
) {
  const { feedId } = await context.params;

  if (!feedId?.trim()) {
    return NextResponse.json(
      { error: "Missing feed id" },
      { status: 400 }
    );
  }

  try {
    const episodes = await getEpisodesByFeedId(feedId.trim());
    return NextResponse.json({ episodes });
  } catch (err) {
    console.error("[podcasts/feed/episodes]", err);
    const message = err instanceof Error ? err.message : "Episodes fetch failed.";
    const status = message.includes("Missing required env") ? 503 : 502;
    return NextResponse.json(
      { error: "Episodes unavailable. Please try again later." },
      { status }
    );
  }
}

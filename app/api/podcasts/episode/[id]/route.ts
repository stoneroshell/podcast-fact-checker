/**
 * GET /api/podcasts/episode/[id]
 * Episode by id (UUID or Podcast Index episode id); include transcript if present.
 * See project.md §9.2, Chunk A §6.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEpisodeById as getEpisodeFromPodcastIndex } from "@/lib/podcast-index/client";
import { getEpisodeById as getEpisodeFromDb, upsertEpisode } from "@/lib/db/episodes";
import { parseTranscriptFromPodcastIndex } from "@/lib/transcript/parse-from-podcast-index";
import type { Episode } from "@/types/episode";
import type { PodcastIndexEpisodeRaw } from "@/lib/podcast-index/types";

function mapPodcastIndexEpisodeToApp(
  raw: PodcastIndexEpisodeRaw,
  transcriptJson: Episode["transcript_json"],
  transcriptSource: Episode["transcript_source"]
): Omit<Episode, "id" | "created_at" | "updated_at"> & {
  podcast_index_episode_id: string;
} {
  const publishedAt =
    raw.datePublished != null ? new Date(raw.datePublished * 1000).toISOString() : null;
  return {
    podcast_id: String(raw.feedId ?? ""),
    podcast_title: raw.feedTitle ?? "",
    podcast_image_url: raw.feedImage ?? "",
    episode_title: raw.title ?? "",
    episode_description: raw.description ?? null,
    audio_url: raw.enclosureUrl ?? "",
    published_at: publishedAt,
    transcript_json: transcriptJson,
    transcript_source: transcriptSource,
    podcast_index_episode_id: String(raw.id ?? ""),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing episode id" }, { status: 400 });
  }

  const trimmedId = id.trim();

  try {
    const fromDb = await getEpisodeFromDb(trimmedId);
    if (fromDb) {
      return NextResponse.json({ episode: fromDb });
    }

    const raw = await getEpisodeFromPodcastIndex(trimmedId);
    if (!raw) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    let transcriptJson: Episode["transcript_json"] = [];
    let transcriptSource: Episode["transcript_source"] = "manual";

    const transcript = raw.transcript;
    if (transcript?.url?.trim()) {
      const sentences = await parseTranscriptFromPodcastIndex({
        url: transcript.url,
        type: transcript.type,
      });
      if (sentences.length > 0) {
        transcriptJson = sentences;
        transcriptSource = "podcast_index";
      }
    }

    const payload = mapPodcastIndexEpisodeToApp(raw, transcriptJson, transcriptSource);
    const upserted = await upsertEpisode(payload);
    if (!upserted) {
      return NextResponse.json(
        { error: "Failed to store episode" },
        { status: 502 }
      );
    }
    return NextResponse.json({ episode: upserted });
  } catch (err) {
    console.error("[podcasts/episode]", err);
    const message = err instanceof Error ? err.message : "Episode fetch failed.";
    const status = message.includes("Missing required env") ? 503 : 502;
    return NextResponse.json(
      { error: "Episode unavailable. Please try again later." },
      { status }
    );
  }
}

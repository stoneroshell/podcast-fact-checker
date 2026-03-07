/**
 * Episode DB operations: get, create, update.
 * See project.md §4.2 (episodes table), Chunk A §3.
 */
import { supabase } from "./client";
import type { Episode, TranscriptSentence } from "@/types/episode";

/** Input for upsert: Episode fields plus optional external id for conflict target */
export type EpisodeUpsertInput = Partial<Episode> & {
  podcast_index_episode_id?: string | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_REGEX.test(id.trim());
}

function rowToEpisode(row: Record<string, unknown>): Episode {
  const transcriptJson = row.transcript_json;
  const sentences: TranscriptSentence[] = Array.isArray(transcriptJson)
    ? (transcriptJson as TranscriptSentence[])
    : [];
  return {
    id: String(row.id ?? ""),
    podcast_id: String(row.podcast_id ?? ""),
    podcast_title: String(row.podcast_title ?? ""),
    podcast_image_url: String(row.podcast_image_url ?? ""),
    episode_title: String(row.episode_title ?? ""),
    episode_description: row.episode_description != null ? String(row.episode_description) : null,
    audio_url: String(row.audio_url ?? ""),
    published_at: row.published_at != null ? String(row.published_at) : null,
    transcript_json: sentences,
    transcript_source: String(row.transcript_source ?? "manual") as Episode["transcript_source"],
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

/**
 * Get episode by internal UUID or by Podcast Index episode id (numeric string).
 */
export async function getEpisodeById(id: string): Promise<Episode | null> {
  const trimmed = id?.trim();
  if (!trimmed) return null;

  const column = isUuid(trimmed) ? "id" : "podcast_index_episode_id";
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq(column, trimmed)
    .maybeSingle();

  if (error) {
    console.error("[episodes] getEpisodeById", error);
    return null;
  }
  if (!data) return null;
  return rowToEpisode(data as Record<string, unknown>);
}

/**
 * Insert or update episode. When podcast_index_episode_id is set, upserts on that column.
 * Otherwise inserts a new row. Returns the upserted/inserted episode.
 */
export async function upsertEpisode(episode: EpisodeUpsertInput): Promise<Episode | null> {
  const externalId = episode.podcast_index_episode_id?.trim() || null;
  const row = {
    podcast_id: episode.podcast_id ?? "",
    podcast_title: episode.podcast_title ?? "",
    podcast_image_url: episode.podcast_image_url ?? "",
    episode_title: episode.episode_title ?? "",
    episode_description: episode.episode_description ?? null,
    audio_url: episode.audio_url ?? "",
    published_at: episode.published_at ?? null,
    transcript_json: episode.transcript_json ?? [],
    transcript_source: episode.transcript_source ?? "manual",
    updated_at: new Date().toISOString(),
    ...(externalId != null ? { podcast_index_episode_id: externalId } : {}),
  };

  if (externalId != null) {
    const { data, error } = await supabase
      .from("episodes")
      .upsert(row, {
        onConflict: "podcast_index_episode_id",
        ignoreDuplicates: false,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[episodes] upsertEpisode", error);
      return null;
    }
    return rowToEpisode(data as Record<string, unknown>);
  }

  const { data, error } = await supabase.from("episodes").insert(row).select("*").single();
  if (error) {
    console.error("[episodes] insert episode", error);
    return null;
  }
  return rowToEpisode(data as Record<string, unknown>);
}

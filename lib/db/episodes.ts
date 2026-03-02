/**
 * Episode DB operations: get, create, update.
 * See project.md §4.2 (episodes table).
 */
import { supabase } from "./client";
import type { Episode } from "@/types/episode";

export async function getEpisodeById(id: string): Promise<Episode | null> {
  // TODO: supabase.from("episodes").select().eq("id", id).single()
  return null;
}

export async function upsertEpisode(episode: Partial<Episode>): Promise<Episode | null> {
  // TODO: insert or update episode; return row
  return null;
}

/**
 * Podcast Index API client.
 * Search, episode metadata, <podcast:transcript> when present.
 * See project.md §3.1, §9.4.
 */

// TODO: Implement authenticated requests (PODCAST_INDEX_API_KEY, PODCAST_INDEX_API_SECRET)
// Docs: https://podcastindex.org/api

export async function searchPodcasts(query: string): Promise<unknown[]> {
  // TODO: GET search endpoint, return list for typeahead
  return [];
}

export async function getEpisodeById(episodeId: string): Promise<unknown | null> {
  // TODO: Fetch episode by id; include transcript if in response
  return null;
}

/**
 * Podcast Index API response types (placeholder).
 * Extend when implementing client.
 * See project.md §3.1.
 */

export type PodcastIndexSearchResult = {
  id?: number;
  title?: string;
  url?: string;
  image?: string;
  // Add fields as needed from API docs
};

export type PodcastIndexEpisode = {
  id?: number;
  title?: string;
  description?: string;
  enclosureUrl?: string;
  transcript?: { url?: string; type?: string };
  // Add fields for <podcast:transcript> and metadata
};

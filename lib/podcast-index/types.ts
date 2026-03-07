/**
 * Podcast Index API response types.
 * See project.md §3.1; API base: https://api.podcastindex.org/api/1.0
 */

/** Feed (podcast) from search/byterm or feed-level data in episode response */
export type PodcastIndexFeed = {
  id?: number;
  title?: string;
  url?: string;
  image?: string;
  [key: string]: unknown;
};

/** Single episode from episodes/byid or item in episodes/byfeedid */
export type PodcastIndexEpisodeRaw = {
  id?: number;
  feedId?: number;
  feedUrl?: string;
  title?: string;
  description?: string;
  enclosureUrl?: string;
  enclosureLength?: number;
  enclosureType?: string;
  link?: string;
  datePublished?: number;
  dateCrawled?: number;
  transcript?: {
    url?: string;
    type?: string;
    language?: string;
    [key: string]: unknown;
  };
  /** Feed-level fields when episode is returned with feed info */
  feedTitle?: string;
  feedImage?: string;
  [key: string]: unknown;
};

/** Response from GET /search/byterm */
export type PodcastIndexSearchResponse = {
  feeds?: PodcastIndexFeed[];
  status?: string;
  [key: string]: unknown;
};

/** Response from GET /episodes/byid */
export type PodcastIndexEpisodeByIdResponse = {
  episode?: PodcastIndexEpisodeRaw;
  status?: string;
  [key: string]: unknown;
};

/** Response from GET /episodes/byfeedid */
export type PodcastIndexEpisodesByFeedResponse = {
  items?: PodcastIndexEpisodeRaw[];
  episodes?: PodcastIndexEpisodeRaw[];
  count?: number;
  status?: string;
  [key: string]: unknown;
};

/** Normalized feed for app (search results) */
export type PodcastIndexSearchResult = {
  feedId: string;
  title: string;
  imageUrl?: string;
  url?: string;
};

/** Normalized episode for app (list or detail) */
export type PodcastIndexEpisodeListItem = {
  id: string;
  feedId: string;
  title: string;
  description?: string;
  enclosureUrl?: string;
  publishedAt?: string;
  feedTitle?: string;
  feedImageUrl?: string;
};

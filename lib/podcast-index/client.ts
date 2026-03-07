/**
 * Podcast Index API client.
 * Search, episode metadata, <podcast:transcript> when present.
 * See project.md §3.1, §9.4.
 * API: https://api.podcastindex.org/api/1.0
 */

import type {
  PodcastIndexSearchResponse,
  PodcastIndexEpisodeByIdResponse,
  PodcastIndexEpisodesByFeedResponse,
  PodcastIndexSearchResult,
  PodcastIndexEpisodeListItem,
  PodcastIndexEpisodeRaw,
} from "./types";

const BASE_URL = "https://api.podcastindex.org/api/1.0";
const USER_AGENT = "Scio/1.0";

function getEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v.trim() === "") {
    throw new Error(`Missing required env: ${name}. Set it for Podcast Index API requests.`);
  }
  return v.trim();
}

/**
 * Build auth headers for Podcast Index API.
 * Authorization = sha1(apiKey + apiSecret + unixTime) in hex.
 */
async function buildAuthHeaders(): Promise<Record<string, string>> {
  const apiKey = getEnv("PODCAST_INDEX_API_KEY");
  const apiSecret = getEnv("PODCAST_INDEX_API_SECRET");
  const unixTime = Math.floor(Date.now() / 1000).toString();
  const hashHex = await sha1Hex(apiKey + apiSecret + unixTime);
  return {
    "User-Agent": USER_AGENT,
    "X-Auth-Date": unixTime,
    "X-Auth-Key": apiKey,
    Authorization: hashHex,
  };
}

/** Node/crypto fallback for SHA-1 when crypto.subtle may be unavailable (e.g. older Node). */
async function sha1Hex(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle != null) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const buffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("crypto");
  return createHash("sha1").update(text, "utf8").digest("hex");
}

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers = await buildAuthHeaders();
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Podcast Index API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function mapFeedToSearchResult(feed: { id?: number; title?: string; url?: string; image?: string }): PodcastIndexSearchResult {
  return {
    feedId: String(feed.id ?? ""),
    title: feed.title ?? "",
    imageUrl: feed.image ?? undefined,
    url: feed.url ?? undefined,
  };
}

function mapEpisodeRawToListItem(
  ep: PodcastIndexEpisodeRaw,
  feedTitle?: string,
  feedImage?: string
): PodcastIndexEpisodeListItem {
  return {
    id: String(ep.id ?? ""),
    feedId: String(ep.feedId ?? ""),
    title: ep.title ?? "",
    description: ep.description ?? undefined,
    enclosureUrl: ep.enclosureUrl ?? undefined,
    publishedAt: ep.datePublished != null ? new Date(ep.datePublished * 1000).toISOString() : undefined,
    feedTitle: feedTitle ?? ep.feedTitle,
    feedImageUrl: feedImage ?? ep.feedImage,
  };
}

/**
 * Search for podcasts by term. Returns feeds (podcasts) for typeahead/selection.
 */
export async function searchPodcasts(query: string): Promise<PodcastIndexSearchResult[]> {
  if (!query?.trim()) return [];
  const data = await fetchApi<PodcastIndexSearchResponse>("/search/byterm", { q: query.trim() });
  const feeds = data.feeds ?? [];
  return feeds.map(mapFeedToSearchResult).filter((r) => r.feedId !== "");
}

/**
 * Fetch a single episode by Podcast Index episode id. Includes transcript URL if present.
 */
export async function getEpisodeById(episodeId: string): Promise<PodcastIndexEpisodeRaw | null> {
  if (!episodeId?.trim()) return null;
  const data = await fetchApi<PodcastIndexEpisodeByIdResponse>("/episodes/byid", {
    id: episodeId.trim(),
  });
  const episode = data.episode;
  return episode ?? null;
}

/**
 * Fetch episodes for a feed (podcast). Returns list for "recent episodes" when user picks a podcast.
 */
export async function getEpisodesByFeedId(feedId: string): Promise<PodcastIndexEpisodeListItem[]> {
  if (!feedId?.trim()) return [];
  const data = await fetchApi<PodcastIndexEpisodesByFeedResponse>("/episodes/byfeedid", {
    id: feedId.trim(),
  });
  const items = data.items ?? data.episodes ?? [];
  return items.map((ep) => mapEpisodeRawToListItem(ep));
}

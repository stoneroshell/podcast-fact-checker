/**
 * Single episode card for search results or episode list.
 * See project.md §9.1.
 */
import type { Episode } from "@/types/episode";

type EpisodeCardProps = {
  episode: Pick<Episode, "id" | "episode_title" | "podcast_title" | "podcast_image_url">;
};

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  // TODO: Link to /episode/[episode.id], show cover art, title, podcast name
  return (
    <article>
      <h3>{episode.episode_title}</h3>
      <p>{episode.podcast_title}</p>
    </article>
  );
}

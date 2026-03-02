/**
 * Episode header: title, cover art, description.
 * See project.md §9.1.
 */
import type { Episode } from "@/types/episode";

type EpisodeHeaderProps = {
  episode: Episode;
};

export default function EpisodeHeader({ episode }: EpisodeHeaderProps) {
  // TODO: Display podcast_title, podcast_image_url, episode_title, episode_description
  return (
    <header>
      <h1>{episode.episode_title}</h1>
      <p>{episode.podcast_title}</p>
    </header>
  );
}

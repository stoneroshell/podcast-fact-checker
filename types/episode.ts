/**
 * Episode and transcript types.
 * See project.md §4.2 (episodes table, transcript sentence object).
 */

export type TranscriptSource = "podcast_index" | "manual" | "whisper";

export type TranscriptSentence = {
  id: string;
  text: string;
  start_time: number | null;
  end_time: number | null;
};

export type Episode = {
  id: string;
  podcast_id: string;
  podcast_title: string;
  podcast_image_url: string;
  episode_title: string;
  episode_description: string | null;
  audio_url: string;
  published_at: string | null;
  transcript_json: TranscriptSentence[];
  transcript_source: TranscriptSource;
  created_at: string;
  updated_at: string;
};

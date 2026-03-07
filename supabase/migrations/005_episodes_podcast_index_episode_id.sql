-- Add Podcast Index episode id for upsert-by-external-id.
-- Nullable so manual/whisper episodes can have NULL (UNIQUE allows multiple NULLs in PostgreSQL).
-- See project.md Chunk A §3.

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS podcast_index_episode_id TEXT UNIQUE;

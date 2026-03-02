-- Scio: episodes, claims, claim_cache
-- See project.md §4.2

CREATE TYPE transcript_source_enum AS ENUM (
  'podcast_index',
  'manual',
  'whisper'
);

CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id TEXT NOT NULL,
  podcast_title TEXT NOT NULL,
  podcast_image_url TEXT,
  episode_title TEXT NOT NULL,
  episode_description TEXT,
  audio_url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  transcript_json JSONB NOT NULL DEFAULT '[]',
  transcript_source transcript_source_enum NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  sentence_id TEXT,
  selected_text TEXT NOT NULL,
  classification TEXT NOT NULL,
  accuracy_percentage SMALLINT NOT NULL CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
  context_summary TEXT NOT NULL,
  supporting_evidence JSONB NOT NULL DEFAULT '[]',
  contradicting_evidence JSONB NOT NULL DEFAULT '[]',
  confidence_score SMALLINT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  sources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_claims_episode_id ON claims(episode_id);
CREATE INDEX idx_claims_episode_sentence ON claims(episode_id, sentence_id);

CREATE TABLE claim_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_claim_hash TEXT NOT NULL UNIQUE,
  normalized_claim_text TEXT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_claim_cache_hash ON claim_cache(normalized_claim_hash);

-- Optional: RLS policies (enable after Supabase project is linked)
-- ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE claim_cache ENABLE ROW LEVEL SECURITY;

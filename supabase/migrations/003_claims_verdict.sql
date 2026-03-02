-- Add verdict column to claims for source-hierarchy v1.
-- Nullable for existing rows; new pipeline writes verdict.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS verdict TEXT;

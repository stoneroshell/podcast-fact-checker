-- Add neutral_evidence to claims for three-bucket evidence classification.
-- See project.md §4.2; pipeline stores supporting, contradicting, and neutral evidence.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS neutral_evidence JSONB NOT NULL DEFAULT '[]';

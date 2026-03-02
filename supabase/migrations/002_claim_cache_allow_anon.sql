-- Allow anon to read/write claim_cache (global cache keyed by hash, no user data).
-- Fixes: "new row violates row-level security policy for table claim_cache"
-- Run this in Supabase SQL Editor if RLS is enabled on claim_cache.

ALTER TABLE claim_cache DISABLE ROW LEVEL SECURITY;

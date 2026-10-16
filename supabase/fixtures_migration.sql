-- ==============================================================================
-- PROXIMA E-CLASH 2026 — Fixtures Table Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- ── FIXTURES TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fixtures (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  game          TEXT         NOT NULL,
  format        TEXT         NOT NULL CHECK (format IN ('knockout', 'lobby')),
  round         INT          NOT NULL DEFAULT 1,
  match_no      INT          NOT NULL DEFAULT 1,

  -- Array of registration_ids (ECL-2026-xxxx).
  -- '' (empty string) = a bye slot.
  -- For lobbies this can be more than 2 entries.
  players       TEXT[]       NOT NULL DEFAULT '{}',

  winner        TEXT,            -- registration_id of the winner (NULL if undecided)
  locked        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Only one match per (game, round, match_no) — used for upsert conflict target
  CONSTRAINT fixtures_game_round_match_no_key UNIQUE (game, round, match_no)
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_fixtures_game        ON public.fixtures (game);
CREATE INDEX IF NOT EXISTS idx_fixtures_game_round  ON public.fixtures (game, round, match_no);

-- ==============================================================================
-- ROW-LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;

-- ⚠️  IMPORTANT: This app does NOT use Supabase Auth (anon / JWT sign-in).
-- The admin portal uses its own passkey + base64 token validated entirely
-- server-side in Vercel serverless functions (api/_handlers/admin/fixtures.js).
-- The service_role key used by those functions already bypasses RLS.
--
-- Therefore:
--   • Public SELECT is safe — fixtures are meant to be viewable (e.g. by volunteers).
--   • Write access (INSERT / UPDATE / DELETE) is NEVER granted to anon or
--     authenticated roles here; all writes come exclusively through the serverless
--     API using the service_role key, which skips RLS entirely.
--   • We do NOT create a permissive write policy for 'authenticated' because the
--     admin is NOT signed in via Supabase Auth — doing so would open writes to
--     any Supabase-authenticated user, which would be a security hole.

-- Allow anyone (public) to read fixtures (e.g. volunteer scanner, leaderboard)
DROP POLICY IF EXISTS "Allow public read fixtures" ON public.fixtures;
CREATE POLICY "Allow public read fixtures"
  ON public.fixtures
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.fixtures TO anon, authenticated;

-- Service role (used by serverless API) gets full access implicitly (bypasses RLS).
-- No explicit INSERT/UPDATE/DELETE policy is needed for service_role.

-- Expose only the registration ID and player name needed by the public fixtures.
-- The view owner reads registrations; anon/authenticated receive access only to
-- these two projected columns. Do not add a public policy to registrations.
CREATE OR REPLACE VIEW public.public_players
WITH (security_barrier = true) AS
  SELECT registration_id AS reg_id, full_name AS player_name
  FROM public.registrations;

REVOKE ALL ON public.public_players FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_players TO anon, authenticated;

-- Enable fixture INSERT/UPDATE/DELETE broadcasts. This is safe to re-run if
-- fixtures has already been added to the Supabase Realtime publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;
  END IF;
END
$$;

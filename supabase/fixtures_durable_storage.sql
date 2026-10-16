-- ==============================================================================
-- PROXIMA E-CLASH 2026 — Durable Fixture Storage Migration
-- Run this in the Supabase SQL Editor AFTER the original fixtures_migration.sql.
-- ==============================================================================

-- ── 1. ADD / CLEAN COLUMNS ON fixtures ────────────────────────────────────────

-- Remove scheduled_at and venue columns if previously created
ALTER TABLE public.fixtures DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE public.fixtures DROP COLUMN IF EXISTS venue;

-- Snapshot of player names at assignment time (parallel array to `players`)
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS player_names TEXT[] DEFAULT '{}';

-- Winner name snapshot
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS winner_name TEXT;

-- Match status: 'scheduled' | 'completed' | 'bye'
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';

-- When the match was completed (winner marked)
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Auto-updated on every UPDATE
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ── 2. updated_at TRIGGER ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fixtures_updated_at ON public.fixtures;
CREATE TRIGGER trg_fixtures_updated_at
  BEFORE UPDATE ON public.fixtures
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── 3. fixtures_archive TABLE ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fixtures_archive (
  id            UUID         NOT NULL,
  game          TEXT         NOT NULL,
  format        TEXT         NOT NULL,
  round         INT          NOT NULL DEFAULT 1,
  match_no      INT          NOT NULL DEFAULT 1,
  players       TEXT[]       NOT NULL DEFAULT '{}',
  player_names  TEXT[]       DEFAULT '{}',
  winner        TEXT,
  winner_name   TEXT,
  status        TEXT         NOT NULL DEFAULT 'scheduled',
  completed_at  TIMESTAMPTZ,
  locked        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  archived_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  batch_id      UUID         NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_fixtures_archive_game ON public.fixtures_archive (game);
CREATE INDEX IF NOT EXISTS idx_fixtures_archive_batch ON public.fixtures_archive (batch_id);

-- ── 4. RLS for fixtures_archive (admin-only, no public read) ─────────────────

ALTER TABLE public.fixtures_archive ENABLE ROW LEVEL SECURITY;

-- Service role (used by serverless API) gets full access (bypasses RLS).
-- No public/anon/authenticated read policy — keeps archive private.
CREATE POLICY "Allow service role full access to fixtures_archive"
  ON public.fixtures_archive
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 5. RPC: archive_and_delete_fixtures ──────────────────────────────────────
-- Archives all current fixture rows for a game, then deletes them (or just
-- non-locked rows). Runs in a single transaction so no data is ever lost.

CREATE OR REPLACE FUNCTION public.archive_and_delete_fixtures(
  p_game TEXT,
  p_delete_locked BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
BEGIN
  -- Copy rows into archive
  INSERT INTO public.fixtures_archive
    (id, game, format, round, match_no, players, player_names,
     winner, winner_name, status, completed_at,
     locked, created_at, updated_at, archived_at, batch_id)
  SELECT
    id, game, format, round, match_no, players, player_names,
    winner, winner_name, status, completed_at,
    locked, created_at, updated_at, NOW(), v_batch_id
  FROM public.fixtures
  WHERE game = p_game
    AND (p_delete_locked OR locked = FALSE);

  -- Delete the archived rows
  DELETE FROM public.fixtures
  WHERE game = p_game
    AND (p_delete_locked OR locked = FALSE);

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service_role can call this RPC
REVOKE ALL ON FUNCTION public.archive_and_delete_fixtures(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_and_delete_fixtures(TEXT, BOOLEAN) TO service_role;

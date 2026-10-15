-- ==============================================================================
-- PROXIMA E-CLASH 2026 — Supabase PostgreSQL Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT UNIQUE NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at_ist TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  campus_id TEXT NOT NULL,
  campus_email TEXT NOT NULL,
  year TEXT NOT NULL,
  game TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED',
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by TEXT,
  payment_utr TEXT UNIQUE,
  payment_screenshot TEXT,
  payment_status TEXT DEFAULT 'PENDING',
  paid_at TEXT,
  amount NUMERIC DEFAULT 49,
  payment_mode TEXT DEFAULT 'UPI',
  verification_status TEXT DEFAULT 'VERIFIED',
  verified_by TEXT DEFAULT 'SYSTEM',
  verified_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for Campus ID if single-game entry only
CREATE INDEX IF NOT EXISTS idx_registrations_reg_id ON public.registrations(registration_id);
CREATE INDEX IF NOT EXISTS idx_registrations_campus_id ON public.registrations(campus_id);
CREATE INDEX IF NOT EXISTS idx_registrations_campus_email ON public.registrations(campus_email);
CREATE INDEX IF NOT EXISTS idx_registrations_game ON public.registrations(game);
CREATE INDEX IF NOT EXISTS idx_registrations_utr ON public.registrations(payment_utr);

-- 2. VOLUNTEERS TABLE
CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL, -- Campus ID in lowercase
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'volunteer', -- 'volunteer' or 'lead'
  station TEXT DEFAULT 'All',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_username ON public.volunteers(username);
CREATE INDEX IF NOT EXISTS idx_volunteers_vol_id ON public.volunteers(volunteer_id);

-- 3. CHECK-IN AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.checkin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  registration_id TEXT NOT NULL,
  game TEXT,
  result TEXT NOT NULL, -- 'CHECKED_IN', 'ALREADY_CHECKED_IN', 'WRONG_STATION_OVERRIDE', 'INVALID'
  volunteer_id TEXT,
  volunteer_name TEXT,
  station TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkin_logs_reg_id ON public.checkin_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_timestamp ON public.checkin_logs(timestamp DESC);

-- 4. PAYMENT AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  registration_id TEXT,
  campus_id TEXT,
  utr TEXT,
  actor TEXT DEFAULT 'SYSTEM',
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_timestamp ON public.payment_audit_logs(timestamp DESC);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- The backend serverless functions connect via SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS safely. Enable RLS to protect direct client-side access.
-- ==============================================================================
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon public read-only of basic tournament registration counts (optional)
CREATE POLICY "Allow service role full access to registrations"
  ON public.registrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to volunteers"
  ON public.volunteers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to checkin_logs"
  ON public.checkin_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to payment_audit_logs"
  ON public.payment_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

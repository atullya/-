-- =============================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- 1. Notebooks table (no user_id — single-user personal app)
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Entries table (no user_id — single-user personal app)
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing installations: run this file again in the Supabase SQL Editor.
-- Old entries are deliberately marked as AD so their historical dates remain correct.
ALTER TABLE entries ADD COLUMN IF NOT EXISTS meter_reading DOUBLE PRECISION;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS date_calendar TEXT NOT NULL DEFAULT 'ad'
  CHECK (date_calendar IN ('ad', 'bs'));

-- 3. Scooter service history
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  meter_reading DOUBLE PRECISION,
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_entries_notebook_id ON entries(notebook_id);
CREATE INDEX IF NOT EXISTS idx_services_date ON services(date DESC);

-- Explicitly disable Row Level Security on both tables.
-- This is required even if not set at creation time because
-- a previous migration may have enabled RLS.
ALTER TABLE notebooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

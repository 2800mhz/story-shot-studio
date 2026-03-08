-- Migration 004: Store per-user model preferences in user_settings
-- This is additive — existing localStorage preferences still work as fallback.
-- Creates user_settings table if it doesn't exist, then adds model preference columns.

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY IF NOT EXISTS "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Add model preference columns (idempotent)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS gemini_model TEXT DEFAULT 'gemini-2.0-flash';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS variant_count INTEGER DEFAULT 3;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 1.0;

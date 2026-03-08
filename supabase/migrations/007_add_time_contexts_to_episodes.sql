-- Add time_contexts column to episodes table
-- Stores an array of TimeContext objects (label, era, season, timeOfDay, lighting, weather, historicalNotes)
-- as JSONB so it can be queried and updated efficiently.

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS time_contexts JSONB NOT NULL DEFAULT '[]'::jsonb;

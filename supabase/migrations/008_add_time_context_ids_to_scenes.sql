-- Add time_context_ids column to scenes table
-- Stores an array of TimeContext IDs linked to the scene.

ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS time_context_ids TEXT[] NOT NULL DEFAULT '{}';

-- Add character_data and location_data columns to episodes table
-- These columns store JSON-serialized character and location arrays
-- for the two-stage AI workflow, preserving exact IDs used by scene cards.

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS character_data TEXT,
  ADD COLUMN IF NOT EXISTS location_data TEXT;

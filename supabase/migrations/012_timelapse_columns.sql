-- ============================================
-- 012: Timelapse Stage Columns for Prompts
-- Adds timelapse metadata to the prompts table
-- to support the timelapse sequence generation feature.
-- ============================================

-- Add timelapse columns to the prompts table
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS is_timelapse_member BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS timelapse_stage_number INTEGER,
  ADD COLUMN IF NOT EXISTS timelapse_stage_label TEXT,
  ADD COLUMN IF NOT EXISTS time_progress_percentage FLOAT;

-- Composite index for efficient timelapse queries
-- (e.g. "all timelapse stages for a scene, ordered by stage number")
CREATE INDEX IF NOT EXISTS idx_timelapse_scenes
  ON prompts(scene_id, is_timelapse_member, timelapse_stage_number)
  WHERE is_timelapse_member = true;

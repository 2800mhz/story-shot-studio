-- ============================================
-- 013: Architectural Narratives Table
-- Adds a dedicated table for architectural narrative progressions,
-- which represent multi-stage timelapse sequences with camera strategy,
-- anchor elements, and narrative understanding.
-- ============================================

CREATE TABLE IF NOT EXISTS architectural_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  scene_ids TEXT[] DEFAULT '{}',              -- Scene card IDs this narrative relates to

  -- WHAT is transforming?
  narrative_subject TEXT NOT NULL,            -- "City", "Lake", "Glacier", "Moon"
  narrative_type TEXT NOT NULL,               -- "urban_growth", "environmental_transformation", ...

  -- WHY is it transforming?
  transformation_driver TEXT,                 -- "Water discovery", "Climate", "Time"

  -- Anchor element
  anchor_name TEXT NOT NULL,
  anchor_description TEXT,
  anchor_role TEXT,                           -- "origin", "center", "witness", ...
  anchor_symbolism TEXT,
  anchor_visibility TEXT DEFAULT 'always',    -- "always", "primary_focus", "contextual"
  anchor_evolution JSONB,                     -- Array of per-stage anchor state strings

  -- Camera progression
  camera_strategy TEXT NOT NULL,             -- "progressive_elevation", "circular_orbit", ...
  camera_description TEXT,
  camera_purpose TEXT,

  -- Stages (full JSONB array of ArchitecturalNarrativeStage)
  stage_count INTEGER,
  stages JSONB NOT NULL DEFAULT '[]',

  -- Prompt generation strategy
  prompt_consistency TEXT,                   -- "camera_locked", "progressive_movement", ...
  anchor_treatment TEXT,                     -- "always_centered", "evolving_role", ...
  narrative_theme TEXT,

  -- Status
  status TEXT DEFAULT 'pending',             -- "pending", "generating", "done", "error"

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient lookup by episode
CREATE INDEX IF NOT EXISTS idx_architectural_narratives_episode
  ON architectural_narratives(episode_id);

-- Index for efficient lookup by project
CREATE INDEX IF NOT EXISTS idx_architectural_narratives_project
  ON architectural_narratives(project_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE TRIGGER update_architectural_narratives_updated_at
  BEFORE UPDATE ON architectural_narratives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Characters & Locations Sync Support
-- Add updated_at, indexes, and RLS policies
-- for global_characters and global_locations
-- ============================================

-- Add updated_at columns
ALTER TABLE global_characters
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE global_locations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Triggers to keep updated_at current on UPDATE
CREATE TRIGGER update_global_characters_updated_at
  BEFORE UPDATE ON global_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_locations_updated_at
  BEFORE UPDATE ON global_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_global_characters_project
  ON global_characters(project_id, name);

CREATE INDEX IF NOT EXISTS idx_global_locations_project
  ON global_locations(project_id, name);

-- RLS policies for global_characters
ALTER TABLE global_characters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'global_characters'
      AND policyname = 'Users can manage their project characters'
  ) THEN
    CREATE POLICY "Users can manage their project characters"
      ON global_characters
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = global_characters.project_id
            AND projects.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = global_characters.project_id
            AND projects.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS policies for global_locations
ALTER TABLE global_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'global_locations'
      AND policyname = 'Users can manage their project locations'
  ) THEN
    CREATE POLICY "Users can manage their project locations"
      ON global_locations
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = global_locations.project_id
            AND projects.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = global_locations.project_id
            AND projects.user_id = auth.uid()
        )
      );
  END IF;
END $$;

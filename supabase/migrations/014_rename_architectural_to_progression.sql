-- Rename table from architectural_narratives to progression_narratives
ALTER TABLE IF EXISTS public.architectural_narratives
RENAME TO progression_narratives;

-- Update status column values (draft → pending for consistency)
UPDATE progression_narratives
SET status = 'pending'
WHERE status = 'draft';

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_arch_narratives_episode;

-- Create new index with progression naming
CREATE INDEX IF NOT EXISTS idx_progression_narratives_episode
ON progression_narratives(episode_id);

-- Add comment
COMMENT ON TABLE progression_narratives IS
'Universal progression narrative system - works for any transformation (cities, lakes, glaciers, moons, etc.)';

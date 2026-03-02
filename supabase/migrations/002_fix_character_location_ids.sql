-- ============================================
-- FIX: character_ids and location_ids columns
-- Change from UUID[] to TEXT[] (for now)
-- ============================================

-- Scenes table: Change character_ids and location_ids to TEXT[]
ALTER TABLE scenes 
ALTER COLUMN character_ids TYPE TEXT[] 
USING character_ids::TEXT[];

ALTER TABLE scenes 
ALTER COLUMN location_ids TYPE TEXT[] 
USING location_ids::TEXT[];

-- Set default to empty array
ALTER TABLE scenes 
ALTER COLUMN character_ids SET DEFAULT '{}';

ALTER TABLE scenes 
ALTER COLUMN location_ids SET DEFAULT '{}';

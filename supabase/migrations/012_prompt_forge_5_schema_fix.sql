-- ============================================
-- 012: Prompt Forge 5.0 - PR-1 schema fixes
-- Safe/idempotent migration for schema drift
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- prompts: add missing columns used by app
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS generation_type TEXT DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS revision_prompt TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- user_settings: normalize gemini_model -> model only when needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'gemini_model'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'model'
  ) THEN
    ALTER TABLE user_settings RENAME COLUMN gemini_model TO model;
  END IF;
END $$;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-2.0-flash';

-- references table (missing in some environments)
CREATE TABLE IF NOT EXISTS references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  reference_type TEXT DEFAULT 'subject',
  ai_analysis TEXT,
  assigned_scene_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_references_user_id ON references(user_id);
CREATE INDEX IF NOT EXISTS idx_references_episode_id ON references(episode_id);

-- scenes: add missing scene-card fields
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS visual_style TEXT DEFAULT 'realistic',
  ADD COLUMN IF NOT EXISTS narrative_layer TEXT DEFAULT 'historical',
  ADD COLUMN IF NOT EXISTS start_index INTEGER,
  ADD COLUMN IF NOT EXISTS end_index INTEGER;

-- episodes: add episode style fields
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS episode_prompt TEXT,
  ADD COLUMN IF NOT EXISTS episode_prompt_tr TEXT,
  ADD COLUMN IF NOT EXISTS episode_style_history JSONB DEFAULT '[]'::jsonb;

-- references RLS + policy (idempotent)
ALTER TABLE references ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'references'
      AND policyname = 'Users manage own references'
  ) THEN
    CREATE POLICY "Users manage own references"
      ON references
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

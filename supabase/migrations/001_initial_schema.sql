-- ============================================
-- Story Shot Studio - Database Schema
-- ============================================
--
-- INSTALLATION INSTRUCTIONS:
--
-- Option 1: Supabase Dashboard (Recommended)
-- 1. Go to your Supabase project dashboard
-- 2. Click "SQL Editor" in left sidebar
-- 3. Click "New Query"
-- 4. Copy this ENTIRE file and paste it
-- 5. Click "Run" button
-- 6. Wait for "Success. No rows returned" message
--
-- Option 2: Supabase CLI
-- 1. Install CLI: npm install -g supabase
-- 2. Login: supabase login
-- 3. Link project: supabase link --project-ref YOUR_PROJECT_REF
-- 4. Push migration: supabase db push
--
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROJECTS table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  style_guide TEXT,
  master_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EPISODES table
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number INT NOT NULL,
  title TEXT NOT NULL,
  document_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, episode_number)
);

-- GLOBAL_CHARACTERS table
CREATE TABLE global_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_prompt TEXT,
  first_appearance INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- GLOBAL_LOCATIONS table
CREATE TABLE global_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- SCENES table
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  scene_number INT NOT NULL,
  text TEXT NOT NULL,
  visual_note TEXT,
  character_ids UUID[] DEFAULT '{}',
  location_ids UUID[] DEFAULT '{}',
  analysis JSONB,
  optimizations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, scene_number)
);

-- PROMPTS table
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  type TEXT,
  label TEXT,
  shot_type TEXT NOT NULL,
  summary TEXT,
  explanation TEXT,
  prompt_text TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_episodes_project_id ON episodes(project_id);
CREATE INDEX idx_scenes_episode_id ON scenes(episode_id);
CREATE INDEX idx_prompts_scene_id ON prompts(scene_id);
CREATE INDEX idx_global_characters_project_id ON global_characters(project_id);
CREATE INDEX idx_global_locations_project_id ON global_locations(project_id);

-- RLS (Row Level Security) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Projects: User can only see their own projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Episodes: User can see episodes of their projects
CREATE POLICY "Users can view episodes of their projects"
  ON episodes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert episodes of their projects"
  ON episodes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update episodes of their projects"
  ON episodes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete episodes of their projects"
  ON episodes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
  ));

-- Global Characters
CREATE POLICY "Users can view characters of their projects"
  ON global_characters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_characters.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert characters of their projects"
  ON global_characters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_characters.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update characters of their projects"
  ON global_characters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_characters.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete characters of their projects"
  ON global_characters FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_characters.project_id AND projects.user_id = auth.uid()
  ));

-- Global Locations
CREATE POLICY "Users can view locations of their projects"
  ON global_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_locations.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert locations of their projects"
  ON global_locations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_locations.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update locations of their projects"
  ON global_locations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_locations.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete locations of their projects"
  ON global_locations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = global_locations.project_id AND projects.user_id = auth.uid()
  ));

-- Scenes
CREATE POLICY "Users can view scenes of their projects"
  ON scenes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM episodes 
    JOIN projects ON projects.id = episodes.project_id 
    WHERE episodes.id = scenes.episode_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert scenes of their projects"
  ON scenes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM episodes 
    JOIN projects ON projects.id = episodes.project_id 
    WHERE episodes.id = scenes.episode_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update scenes of their projects"
  ON scenes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM episodes 
    JOIN projects ON projects.id = episodes.project_id 
    WHERE episodes.id = scenes.episode_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete scenes of their projects"
  ON scenes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM episodes 
    JOIN projects ON projects.id = episodes.project_id 
    WHERE episodes.id = scenes.episode_id AND projects.user_id = auth.uid()
  ));

-- Prompts
CREATE POLICY "Users can view prompts of their projects"
  ON prompts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM scenes 
    JOIN episodes ON episodes.id = scenes.episode_id
    JOIN projects ON projects.id = episodes.project_id 
    WHERE scenes.id = prompts.scene_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert prompts of their projects"
  ON prompts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM scenes 
    JOIN episodes ON episodes.id = scenes.episode_id
    JOIN projects ON projects.id = episodes.project_id 
    WHERE scenes.id = prompts.scene_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update prompts of their projects"
  ON prompts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM scenes 
    JOIN episodes ON episodes.id = scenes.episode_id
    JOIN projects ON projects.id = episodes.project_id 
    WHERE scenes.id = prompts.scene_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete prompts of their projects"
  ON prompts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM scenes 
    JOIN episodes ON episodes.id = scenes.episode_id
    JOIN projects ON projects.id = episodes.project_id 
    WHERE scenes.id = prompts.scene_id AND projects.user_id = auth.uid()
  ));

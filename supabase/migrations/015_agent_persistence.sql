CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT,
  streaming BOOLEAN NOT NULL DEFAULT FALSE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_operation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  reasoning TEXT,
  affected_scene_ids TEXT[] NOT NULL DEFAULT '{}',
  stale_prompt_scene_ids TEXT[] NOT NULL DEFAULT '{}',
  operations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_episode_id ON agent_sessions(episode_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_user_id ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_operation_logs_session_id ON agent_operation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_operation_logs_user_id ON agent_operation_logs(user_id);

ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent sessions"
  ON agent_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent sessions"
  ON agent_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent sessions"
  ON agent_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent sessions"
  ON agent_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own agent messages"
  ON agent_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent messages"
  ON agent_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent messages"
  ON agent_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent messages"
  ON agent_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own agent operation logs"
  ON agent_operation_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent operation logs"
  ON agent_operation_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent operation logs"
  ON agent_operation_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent operation logs"
  ON agent_operation_logs FOR DELETE
  USING (auth.uid() = user_id);

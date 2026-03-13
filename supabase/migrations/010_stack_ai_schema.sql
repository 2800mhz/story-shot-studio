-- Stack.AI: user stacks and session history

CREATE TABLE IF NOT EXISTS user_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Stack',
  tools JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stack_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_idea TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own stacks"
  ON user_stacks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON stack_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_stacks_user_id_idx ON user_stacks(user_id);
CREATE INDEX IF NOT EXISTS stack_sessions_user_id_idx ON stack_sessions(user_id);

-- ============================================
-- 009: API Token Tracking (Bilanço) System
-- Adds token tracking to api_keys and detailed logs
-- ============================================

-- 1. Add token tracking columns to api_keys
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS total_prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_completion_tokens INTEGER DEFAULT 0;

-- 2. Create the detailed API Key Logs table
CREATE TABLE IF NOT EXISTS api_key_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL, -- e.g., 'gemini_chat', 'scene_analysis', 'prompt_generation'
    provider TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_logs_key_id ON api_key_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_key_logs(user_id);

-- RLS Policies for logs
ALTER TABLE api_key_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_key_logs' AND policyname = 'Users can view their own API logs'
    ) THEN
        CREATE POLICY "Users can view their own API logs"
            ON api_key_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_key_logs' AND policyname = 'Users can insert their own API logs'
    ) THEN
        CREATE POLICY "Users can insert their own API logs"
            ON api_key_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Update the RPC function to increment usage AND tokens AND log it
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  key_id UUID, 
  p_prompt_tokens INTEGER DEFAULT 0, 
  p_completion_tokens INTEGER DEFAULT 0,
  p_operation_type TEXT DEFAULT 'api_request'
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_provider TEXT;
BEGIN
  -- Update key and get provider/user
  UPDATE api_keys
  SET usage_count = usage_count + 1,
      total_prompt_tokens = COALESCE(total_prompt_tokens, 0) + p_prompt_tokens,
      total_completion_tokens = COALESCE(total_completion_tokens, 0) + p_completion_tokens,
      last_used_at = NOW()
  WHERE id = key_id
  RETURNING user_id, provider INTO v_user_id, v_provider;

  -- Create detailed log
  IF v_user_id IS NOT NULL AND (p_prompt_tokens > 0 OR p_completion_tokens > 0) THEN
    INSERT INTO api_key_logs (key_id, user_id, operation_type, provider, prompt_tokens, completion_tokens)
    VALUES (key_id, v_user_id, p_operation_type, v_provider, p_prompt_tokens, p_completion_tokens);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

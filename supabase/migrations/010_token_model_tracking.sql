-- ============================================
-- 010: Add Model Tracking to API Key Logs
-- Updates the logging to track the model used
-- ============================================

-- 1. Add 'model' column to api_key_logs
ALTER TABLE api_key_logs 
ADD COLUMN IF NOT EXISTS model TEXT;

-- 2. Update the RPC function to increment usage AND tokens AND log the model
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  key_id UUID, 
  p_prompt_tokens INTEGER DEFAULT 0, 
  p_completion_tokens INTEGER DEFAULT 0,
  p_operation_type TEXT DEFAULT 'api_request',
  p_model TEXT DEFAULT NULL
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
    INSERT INTO api_key_logs (key_id, user_id, operation_type, provider, prompt_tokens, completion_tokens, model)
    VALUES (key_id, v_user_id, p_operation_type, v_provider, p_prompt_tokens, p_completion_tokens, p_model);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

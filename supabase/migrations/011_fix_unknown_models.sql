-- ============================================
-- 011: Fix Unknown Models in API Logs
-- Updates NULL or empty model names to a default
-- ============================================

UPDATE api_key_logs
SET model = 'gemini-2.0-flash'
WHERE (model IS NULL OR model = '')
  AND provider = 'gemini';

-- If there are OpenAI or Anthropic unknowns (optional but good practice)
UPDATE api_key_logs
SET model = 'gpt-4o'
WHERE (model IS NULL OR model = '')
  AND provider = 'openai';

UPDATE api_key_logs
SET model = 'claude-3-5-sonnet-20241022'
WHERE (model IS NULL OR model = '')
  AND provider = 'anthropic';

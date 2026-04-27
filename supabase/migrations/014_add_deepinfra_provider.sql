-- Migration 014: Add 'deepinfra' to api_keys provider constraint
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Step 1: Drop the existing provider check constraint
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_check;

-- Step 2: Re-add with deepinfra included
ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_provider_check
  CHECK (provider IN ('gemini', 'openai', 'anthropic', 'groq', 'deepinfra'));

-- Step 3: DeepInfra pricing reference (informational)
-- moonshotai/Kimi-K2.6: ~$0.14/M input, $0.55/M output
-- (via https://api.deepinfra.com/v1/openai — OpenAI-compatible endpoint)

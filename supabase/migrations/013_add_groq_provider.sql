-- Migration 013: Add 'groq' to api_keys provider constraint
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Step 1: Drop the existing provider check constraint
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_check;

-- Step 2: Re-add with groq included
ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_provider_check
  CHECK (provider IN ('gemini', 'openai', 'anthropic', 'groq'));

-- Step 3: Add Groq pricing reference to any cost tracking views (informational)
-- Groq compound-beta: effectively free tier during beta
-- Groq llama-3.3-70b-versatile: ~$0.59/M input, $0.79/M output
-- Groq llama-3.1-8b-instant: ~$0.05/M input, $0.08/M output

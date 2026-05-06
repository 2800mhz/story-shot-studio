export const AGENT_PROVIDER = 'deepinfra' as const;
export const AGENT_MODEL = 'Qwen/Qwen3.6-35B-A3B';
export const AGENT_REASONING_LABEL = 'Reasoning kapal\u0131';

export const AGENT_MODEL_OPTIONS = {
  providerOverride: AGENT_PROVIDER,
  modelOverride: AGENT_MODEL,
  lockProvider: true,
};

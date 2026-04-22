import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/aiProvider', () => ({
  aiProvider: {
    generateContent: vi.fn(),
  },
}));

import { aiProvider } from '@/lib/aiProvider';
import { generatePromptsForScene } from '@/lib/promptGenerator';

describe('promptGenerator JSON recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses fenced JSON and escapes newlines inside string values', async () => {
    const onRetry = vi.fn();
    const generateSpy = vi.mocked(aiProvider.generateContent).mockResolvedValue(`\`\`\`json
{
  "prompts": [
    {
      "shotType": "Wide",
      "summary": "Sahne özeti",
      "explanation": "Açıklama",
      "prompt": "satır 1
satır 2"
    }
  ],
  "analysis": {},
  "optimizations": []
}
\`\`\``);

    const result = await generatePromptsForScene(
      { text: 'Örnek sahne', visualNote: 'Örnek not' } as any,
      [],
      [],
      'master prompt',
      undefined,
      undefined,
      '16:9',
      undefined,
      undefined,
      undefined,
      undefined,
      'initial',
      onRetry
    );

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(result.prompts[0].promptText).toContain('satır 1\nsatır 2');
  });

  it('recovers truncated JSON by closing open objects without retrying', async () => {
    const onRetry = vi.fn();
    const generateSpy = vi.mocked(aiProvider.generateContent).mockResolvedValue(
      'Preamble before JSON {"prompts":[{"shotType":"Wide","summary":"Sahne özeti","explanation":"Açıklama","prompt":"sahne promptu"}],"analysis":{"complexity":"low"} trailing'
    );

    const result = await generatePromptsForScene(
      { text: 'Örnek sahne', visualNote: 'Örnek not' } as any,
      [],
      [],
      'master prompt',
      undefined,
      undefined,
      '16:9',
      undefined,
      undefined,
      undefined,
      undefined,
      'initial',
      onRetry
    );

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(result.prompts[0].shotType).toBe('Wide');
  });
});

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
      "prompt": "satır 1 \\"alıntı\\"
satır 2"
    }
  ],
  "analysis": {
    "complexity": "high",
    "difficultyScore": 9,
    "hasCrowd": true,
    "hasArchitecture": true,
    "hasTransformation": false,
    "hasHistoricalFigure": false,
    "recommendedStyle": "cinematic",
    "productionNotes": ["kritik not"]
  },
  "optimizations": ["Işık açısını güçlendir"]
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
    expect(result.prompts[0].promptText).toContain('satır 1 "alıntı"\nsatır 2');
    expect(result.analysis.complexity).toBe('high');
    expect(result.analysis.hasCrowd).toBe(true);
    expect(result.optimizations).toEqual(['Işık açısını güçlendir']);
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

  it('recovers when truncation happens mid-object before closure', async () => {
    const onRetry = vi.fn();
    const generateSpy = vi.mocked(aiProvider.generateContent).mockResolvedValue(
      '{"prompts":[{"shotType":"Wide","summary":"Sahne özeti","explanation":"Açıklama","prompt":"sahne promptu"}],"analysis":{"complexity":"low"'
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
    // Incomplete trailing object content is discarded; analysis falls back to defaults.
    expect(result.analysis.complexity).toBe('medium');
  });
});

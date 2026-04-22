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
      "prompt": "satır 1 \\"alıntı\\"\\nsatır 2"
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

  it('retries after an empty response and succeeds with valid JSON', async () => {
    const onRetry = vi.fn();
    vi.spyOn(global, 'setTimeout').mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const generateSpy = vi.mocked(aiProvider.generateContent)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('{"prompts":[{"shotType":"Wide","summary":"Sahne özeti","explanation":"Açıklama","prompt":"sahne promptu"}]}');

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

    expect(generateSpy).toHaveBeenCalledTimes(2);
    expect(onRetry).not.toHaveBeenCalled();
    expect(result.prompts[0].shotType).toBe('Wide');
  });

  it('fails after 4 invalid JSON attempts', async () => {
    const onRetry = vi.fn();
    vi.spyOn(global, 'setTimeout').mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const generateSpy = vi.mocked(aiProvider.generateContent).mockResolvedValue('not-json');

    await expect(
      generatePromptsForScene(
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
      )
    ).rejects.toThrow('Invalid JSON after 4 attempts');

    expect(generateSpy).toHaveBeenCalledTimes(4);
    expect(onRetry).toHaveBeenCalledTimes(4);
  });
});

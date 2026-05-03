import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/aiProvider', () => ({
  aiProvider: {
    generateContent: vi.fn(),
  },
}));

import { aiProvider } from '@/lib/aiProvider';
import { generatePromptsForScene, revisePrompt } from '@/lib/promptGenerator';

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
  "selectedIndex": 0
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
    expect(result.prompts[0].isPinned).toBe(true);
    expect(result.prompts[0].isPinnedByAI).toBe(true);
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

  it('reorders prompts by inferred shot type instead of raw response order', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "prompts": [
        { "shotType": "Close-up", "summary": "detay", "explanation": "yakın", "prompt": "close-up of weathered hands gripping an arrow shaft" },
        { "shotType": "Wide Shot", "summary": "geniş", "explanation": "wide", "prompt": "wide shot of dense horse archers crossing the plain in dust" },
        { "shotType": "Medium Shot", "summary": "orta", "explanation": "medium", "prompt": "medium shot of a rider drawing his bow while the formation blurs behind" }
      ],
      "selectedIndex": 0
    }`);

    const result = await generatePromptsForScene(
      { text: 'Örnek sahne', visualNote: 'Yoğun süvari akını', characterIds: [], locationIds: [], timeContextIds: [] } as any,
      [],
      [],
      'master prompt'
    );

    expect(result.prompts.map((prompt) => prompt.type)).toEqual(['wide', 'medium', 'closeup']);
    expect(result.prompts.map((prompt) => prompt.shotType)).toEqual(['Wide Shot', 'Medium Shot', 'Close-up']);
  });

  it('prefers stronger medium or close documentary prompt over a generic wide auto-pin', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "prompts": [
        {
          "shotType": "Wide Shot",
          "summary": "geniş",
          "explanation": "geniş plan",
          "prompt": "shot intent: strategic scale reveal, epic wide shot with flag, 4-5 riders visible in foreground, dust behind them"
        },
        {
          "shotType": "Medium Shot",
          "summary": "orta",
          "explanation": "orta plan",
          "prompt": "shot intent: observed mid-action, medium shot of a timurid horse archer drawing his bow while dense formation and dust stay readable behind him"
        },
        {
          "shotType": "Close-up",
          "summary": "detay",
          "explanation": "yakın plan",
          "prompt": "shot intent: tactile detail, close-up of a calloused hand gripping an arrow, blurred helmets crowding the background"
        }
      ],
      "selectedIndex": 0
    }`);

    const result = await generatePromptsForScene(
      {
        text: 'Örnek sahne',
        visualNote: 'Timurid horse archers in dense formation',
        characterIds: [],
        locationIds: [],
        timeContextIds: [],
      } as any,
      Array.from({ length: 6 }, (_, index) => ({ id: String(index), name: `C${index}` })) as any,
      [],
      'master prompt'
    );

    expect(result.prompts[0].isPinned).toBe(false);
    expect(result.prompts.some((prompt) => prompt.type !== 'wide' && prompt.isPinned)).toBe(true);
  });

  it('injects fresh entity context into prompt revision requests', async () => {
    const generateSpy = vi.mocked(aiProvider.generateContent).mockResolvedValue('revised prompt');

    await revisePrompt(
      'old prompt with long white beard',
      'sakalı güncelle',
      '',
      'test-model',
      1,
      {
        shotType: 'Close-up',
        visualNote: 'Karakterin yüzü ve eli önde',
        projectType: 'documentary',
        renderMode: 'photoreal',
        characters: [
          {
            id: 'char-1',
            name: 'Timur',
            beard: 'clean-shaven',
            clothing: 'dark wool coat',
            physicalFeatures: 'scar above left eyebrow',
          } as any,
        ],
        staleReasons: ['Character attributes updated'],
      }
    );

    const revisionUserMessage = generateSpy.mock.calls[0][0] as string;
    expect(revisionUserMessage).toContain('FRESH CONTEXT');
    expect(revisionUserMessage).toContain('clean-shaven');
    expect(revisionUserMessage).toContain('Character attributes updated');
  });
});


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
      "witnessIndicator": "heel raised mid-transfer",
      "lightSource": "low morning sun from frame left",
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
    expect(result.prompts[0].witnessIndicator).toBe('heel raised mid-transfer');
    expect(result.prompts[0].lightSource).toBe('low morning sun from frame left');
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

  it('preserves camera slot order instead of forcing wide-medium-closeup labels', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "cameraAngleSlots": [
        {
          "focalLength": "100mm macro",
          "angleDeg": "eye-level 0deg",
          "technique": "static locked-off",
          "framing": "extreme close-up",
          "label": "Detay - Eller",
          "rationale": "Eller sahnenin gerilimini tasir."
        },
        {
          "focalLength": "24mm",
          "angleDeg": "high angle 35deg",
          "technique": "crane pull-back",
          "framing": "wide formation",
          "label": "Genis - Formasyon",
          "rationale": "Formasyon ve toz okunur."
        },
        {
          "focalLength": "50mm",
          "angleDeg": "eye-level 0deg",
          "technique": "handheld drift",
          "framing": "medium tracking",
          "label": "Orta - Binici",
          "rationale": "Binicinin aksiyonu takip edilir."
        }
      ],
      "prompts": [
        { "slotIndex": 0, "shotType": "Close-up", "summary": "detay", "explanation": "yakın", "prompt": "close-up of weathered hands gripping an arrow shaft" },
        { "slotIndex": 1, "shotType": "Wide Shot", "summary": "geniş", "explanation": "wide", "prompt": "wide shot of dense horse archers crossing the plain in dust" },
        { "slotIndex": 2, "shotType": "Medium Shot", "summary": "orta", "explanation": "medium", "prompt": "medium shot of a rider drawing his bow while the formation blurs behind" }
      ],
      "selectedIndex": 0
    }`);

    const result = await generatePromptsForScene(
      { text: 'Örnek sahne', visualNote: 'Yoğun süvari akını', characterIds: [], locationIds: [], timeContextIds: [] } as any,
      [],
      [],
      'master prompt'
    );

    expect(result.prompts.map((prompt) => prompt.type)).toEqual(['closeup', 'wide', 'medium']);
    expect(result.prompts.map((prompt) => prompt.label)).toEqual(['Detay - Eller', 'Genis - Formasyon', 'Orta - Binici']);
    expect(result.prompts.map((prompt) => prompt.shotType)).toEqual([
      '100mm macro - extreme close-up - static locked-off',
      '24mm - wide formation - crane pull-back',
      '50mm - medium tracking - handheld drift',
    ]);
    expect(result.cameraAngleSlots[0].promptId).toBe(result.prompts[0].id);
    expect(result.prompts[0].isPinned).toBe(true);
  });

  it('prefers stronger medium or close documentary prompt over a generic wide auto-pin', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "prompts": [
        {
          "shotType": "Wide Shot",
          "summary": "geniş",
          "explanation": "geniş plan",
          "prompt": "shot intent: weak wide, 3-5 riders posed in a centered balanced composition facing camera with clean empty background and a flag"
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
    const pinned = result.prompts.find((prompt) => prompt.isPinned);
    expect(pinned?.pinReason).toBeTruthy();
  });

  it('can prefer wide when the scene is fundamentally about scale and geography', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "prompts": [
        {
          "shotType": "Wide Shot",
          "summary": "geniş",
          "explanation": "geniş plan",
          "prompt": "shot intent: strategic scale reveal, wide shot of a vast migration column crossing the mountain pass, dense formation stretching to the horizon, river and valley geography fully readable"
        },
        {
          "shotType": "Medium Shot",
          "summary": "orta",
          "explanation": "orta plan",
          "prompt": "shot intent: observed mid-action, medium shot of one rider turning in the saddle while others blur behind him"
        },
        {
          "shotType": "Close-up",
          "summary": "detay",
          "explanation": "yakın plan",
          "prompt": "shot intent: tactile detail, close-up of a hand gripping worn leather reins"
        }
      ],
      "selectedIndex": 1
    }`);

    const result = await generatePromptsForScene(
      {
        text: 'Vast migration column crossing a mountain pass at dawn',
        visualNote: 'Scale, geography, valley pressure, formation moving toward the horizon',
        characterIds: [],
        locationIds: [],
        timeContextIds: [],
      } as any,
      Array.from({ length: 8 }, (_, index) => ({ id: String(index), name: `C${index}` })) as any,
      [],
      'master prompt'
    );

    expect(result.prompts[0].type).toBe('wide');
    expect(result.prompts[0].isPinned).toBe(true);
    expect(result.prompts[0].pinReason).toContain('scale');
  });

  it('can prefer close-up when the scene is fundamentally about tactile detail', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "prompts": [
        {
          "shotType": "Wide Shot",
          "summary": "genis",
          "explanation": "genis plan",
          "prompt": "wide shot of the archive room with desks, shelves, and morning haze, one figure small in the background"
        },
        {
          "shotType": "Medium Shot",
          "summary": "orta",
          "explanation": "orta plan",
          "prompt": "medium shot of the old archivist turning toward the table while holding the letter at chest height"
        },
        {
          "shotType": "Close-up",
          "summary": "detay",
          "explanation": "yakin plan",
          "prompt": "close-up of calloused fingers, thumb pressed into the torn wax seal, knuckles whitening as dust catches in the paper fibers"
        }
      ],
      "selectedIndex": 1
    }`);

    const result = await generatePromptsForScene(
      {
        text: 'An old archivist breaks the wax seal and reads the letter in silence',
        visualNote: 'Yakin detay, parmaklar, mum muhur, kagit dokusu, duygusal yuk ellerde',
        characterIds: [],
        locationIds: [],
        timeContextIds: [],
      } as any,
      [{ id: '1', name: 'Archivist' }] as any,
      [],
      'master prompt'
    );

    expect(result.prompts[2].type).toBe('closeup');
    expect(result.prompts[2].isPinned).toBe(true);
  });

  it('appends aspect suffix when a prompt has --no but no --ar flag', async () => {
    vi.mocked(aiProvider.generateContent).mockResolvedValue(`{
      "prompts": [
        {
          "shotType": "Wide Shot",
          "summary": "genis",
          "explanation": "genis plan",
          "prompt": "wide documentary prompt with foreground reeds and deep background --no old flags"
        }
      ],
      "selectedIndex": 0
    }`);

    const result = await generatePromptsForScene(
      { text: 'Ornek sahne', visualNote: 'Genis plan', characterIds: [], locationIds: [], timeContextIds: [] } as any,
      [],
      [],
      'master prompt',
      undefined,
      undefined,
      '4:3'
    );

    expect(result.prompts[0].promptText).toContain('--no old flags --ar 4:3 --v 6');
  });

  it('keeps prompt revision requests lightweight and structure-preserving', async () => {
    const generateSpy = vi.mocked(aiProvider.generateContent).mockResolvedValue('revised prompt');

    await revisePrompt(
      'SHOT INTENT: old prompt with long white beard | CAMERA/COMP: close-up --ar 16:9 --v 6',
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
    expect(revisionUserMessage).toContain('PROMPT TO EDIT');
    expect(revisionUserMessage).toContain('USER CHANGE');
    expect(revisionUserMessage).toContain('Keep this label order exactly');
    expect(revisionUserMessage).toContain('event logic');
    expect(revisionUserMessage).not.toContain('FRESH CONTEXT');
    expect(revisionUserMessage).not.toContain('clean-shaven');
    expect(generateSpy.mock.calls[0][1]).toContain('surgical text editor');
    expect(generateSpy.mock.calls[0][1]).toContain('silently infer');
    expect(generateSpy.mock.calls[0][2]).toMatchObject({ operationType: 'prompt_revision_light' });
  });
});


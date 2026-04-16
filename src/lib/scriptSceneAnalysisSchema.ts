import { z } from 'zod';

export const scriptAnalysisResponseSchema = z.object({
  scenes: z.array(
    z.object({
      perdeNo: z.string().optional(),
      sceneNumber: z.number().optional(),
      text: z.string().optional(),
      visualNote: z.string().optional(),
      visualStyle: z.enum(['realistic', 'symbolic']).optional(),
      characterNames: z.array(z.string()).optional(),
      locationNames: z.array(z.string()).optional(),
      timeContextLabel: z.string().optional(),
    })
  ).default([]),
  characters: z.array(
    z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      isCrowd: z.boolean().optional(),
      age: z.string().optional(),
      ethnicity: z.string().optional(),
      physicalFeatures: z.string().optional(),
      hair: z.string().optional(),
      beard: z.string().optional(),
      clothing: z.string().optional(),
      visualDescription: z.string().optional(),
    })
  ).default([]),
  locations: z.array(
    z.object({
      name: z.string().optional(),
      visualDescription: z.string().optional(),
    })
  ).default([]),
  timeContexts: z.array(
    z.object({
      label: z.string().optional(),
      era: z.string().optional(),
      season: z.string().optional(),
      timeOfDay: z.string().optional(),
      lighting: z.string().optional(),
      weather: z.string().optional(),
      historicalNotes: z.string().optional(),
    })
  ).default([]),
});

export const scriptAnalysisResponseJsonSchema: Record<string, unknown> = {
  type: 'object',
  required: ['scenes', 'characters', 'locations', 'timeContexts'],
  properties: {
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['text', 'visualNote', 'visualStyle', 'characterNames', 'locationNames', 'timeContextLabel'],
        properties: {
          perdeNo: { type: 'string' },
          sceneNumber: { type: 'number' },
          text: { type: 'string' },
          visualNote: { type: 'string' },
          visualStyle: { type: 'string', enum: ['realistic', 'symbolic'] },
          characterNames: { type: 'array', items: { type: 'string' } },
          locationNames: { type: 'array', items: { type: 'string' } },
          timeContextLabel: { type: 'string' },
        },
      },
    },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'name',
          'visualDescription',
          'age',
          'ethnicity',
          'clothing',
          'physicalFeatures',
          'hair',
          'beard'
        ],
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          isCrowd: { type: 'boolean' },
          age: { type: 'string' },
          ethnicity: { type: 'string' },
          physicalFeatures: { type: 'string' },
          hair: { type: 'string' },
          beard: { type: 'string' },
          clothing: { type: 'string' },
          visualDescription: { type: 'string' },
        },
      },
    },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'visualDescription'],
        properties: {
          name: { type: 'string' },
          visualDescription: { type: 'string' },
        },
      },
    },
    timeContexts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'era', 'timeOfDay', 'lighting'],
        properties: {
          label: { type: 'string' },
          era: { type: 'string' },
          season: { type: 'string' },
          timeOfDay: { type: 'string' },
          lighting: { type: 'string' },
          weather: { type: 'string' },
          historicalNotes: { type: 'string' },
        },
      },
    },
  },
};

export function parseScriptAnalysisResponse(content: string) {
  const pickString = (value: unknown, fallback: unknown): string | undefined => {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof fallback === 'string' && fallback.trim()) return fallback;
    return undefined;
  };

  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean) as {
    characters?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  if (Array.isArray(parsed.characters)) {
    parsed.characters = parsed.characters.map((character) => ({
      ...character,
      age: pickString(character.age, character['ageAndEra']),
      ethnicity: pickString(character.ethnicity, character['ethnicityPhenotype']),
      clothing: pickString(character.clothing, character['clothingCostume']),
      physicalFeatures: pickString(character.physicalFeatures, character['physicalTraits']),
    }));
  }

  return scriptAnalysisResponseSchema.parse(parsed);
}
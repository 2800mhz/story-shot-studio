import { z } from 'zod';

const nonEmptyTrimmedString = z.string().trim().min(1);

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
      name: nonEmptyTrimmedString,
      role: z.string().optional(),
      isCrowd: z.boolean().optional(),
      age: nonEmptyTrimmedString,
      ethnicity: nonEmptyTrimmedString,
      physicalFeatures: nonEmptyTrimmedString,
      hair: z.string().optional(),
      beard: z.string().optional(),
      clothing: nonEmptyTrimmedString,
      visualDescription: nonEmptyTrimmedString,
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
      timeOfDay: z.string().optional(),
      lighting: z.string().optional(),
      historicalNotes: z.string().optional(),
    })
  ).default([]),
});

export const scriptAnalysisResponseJsonSchema: Record<string, unknown> = {
  type: 'object',
  required: ['scenes', 'characters', 'locations', 'timeContexts'],
  additionalProperties: false,
  properties: {
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['text', 'visualNote', 'visualStyle', 'characterNames', 'locationNames', 'timeContextLabel'],
        additionalProperties: false,
        properties: {
          perdeNo: { type: 'string' },
          sceneNumber: { type: 'number' },
          text: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          visualNote: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          visualStyle: { type: 'string', enum: ['realistic', 'symbolic'] },
          characterNames: { type: 'array', items: { type: 'string' } },
          locationNames: { type: 'array', items: { type: 'string' } },
          timeContextLabel: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
        },
      },
    },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'name',
          'age',
          'ethnicity',
          'physicalFeatures',
          'clothing',
          'visualDescription',
        ],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          role: { type: 'string' },
          isCrowd: { type: 'boolean' },
          age: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          ethnicity: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          physicalFeatures: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          hair: { type: 'string' },
          beard: { type: 'string' },
          clothing: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          visualDescription: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
        },
      },
    },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'visualDescription'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          visualDescription: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
        },
      },
    },
    timeContexts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 1, pattern: '.*\\S.*' },
          era: { type: 'string' },
          timeOfDay: { type: 'string' },
          lighting: { type: 'string' },
          historicalNotes: { type: 'string' },
        },
      },
    },
  },
};

export function parseScriptAnalysisResponse(content: string) {
  const pickString = (value: unknown, fallback: unknown): string | undefined => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
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

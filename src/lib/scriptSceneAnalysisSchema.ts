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
      name: z.string().min(1),
      role: z.string().optional(),
      isCrowd: z.boolean().optional(),
      age: z.string().min(1),
      ethnicity: z.string().min(1),
      physicalFeatures: z.string().min(1),
      hair: z.string().optional(),
      beard: z.string().optional(),
      clothing: z.string().min(1),
      visualDescription: z.string().min(1),
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
          'age',
          'ethnicity',
          'physicalFeatures',
          'clothing',
          'visualDescription',
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
        required: ['label'],
        properties: {
          label: { type: 'string' },
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
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean) as {
    characters?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  if (Array.isArray(parsed.characters)) {
    parsed.characters = parsed.characters.map((character) => ({
      ...character,
      age: typeof character.age === 'string' ? character.age : character['ageAndEra'],
      ethnicity: typeof character.ethnicity === 'string' ? character.ethnicity : character['ethnicityPhenotype'],
      clothing: typeof character.clothing === 'string' ? character.clothing : character['clothingCostume'],
      physicalFeatures:
        typeof character.physicalFeatures === 'string' ? character.physicalFeatures : character['physicalTraits'],
    }));
  }

  return scriptAnalysisResponseSchema.parse(parsed);
}

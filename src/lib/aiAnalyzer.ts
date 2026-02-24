import { ENTITY_EXTRACTION_PROMPT, SCENE_ANALYSIS_PROMPT } from './analysisPrompts';
import type { ExtractedEntity, SceneAnalysis } from '@/types';

export async function extractEntitiesFromText(
  text: string,
  apiKey: string,
  model: string
): Promise<ExtractedEntity[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const chunks = splitTextIntoChunks(text, 30000);
  const allEntities: ExtractedEntity[] = [];
  let entityCounter = 0;

  for (const chunk of chunks) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: ENTITY_EXTRACTION_PROMPT + chunk }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    });

    if (!response.ok) throw new Error('Entity extraction failed');

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.characters) {
        parsed.characters.forEach((char: { name: string; description: string }) => {
          allEntities.push({
            id: `char-${++entityCounter}`,
            type: 'character',
            name: char.name,
            visualDescription: char.description,
            sceneIds: [],
            firstMention: text.indexOf(char.name),
          });
        });
      }

      if (parsed.locations) {
        parsed.locations.forEach((loc: { name: string; description: string }) => {
          allEntities.push({
            id: `loc-${++entityCounter}`,
            type: 'location',
            name: loc.name,
            visualDescription: loc.description,
            sceneIds: [],
            firstMention: text.indexOf(loc.name),
          });
        });
      }

      if (parsed.objects) {
        parsed.objects.forEach((obj: { name: string; description: string }) => {
          allEntities.push({
            id: `obj-${++entityCounter}`,
            type: 'object',
            name: obj.name,
            visualDescription: obj.description,
            sceneIds: [],
            firstMention: text.indexOf(obj.name),
          });
        });
      }
    } catch (e) {
      console.error('Failed to parse entity extraction response', e);
    }
  }

  return allEntities;
}

export async function analyzeScene(
  sceneText: string,
  apiKey: string,
  model: string
): Promise<Omit<SceneAnalysis, 'sceneId'>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: SCENE_ANALYSIS_PROMPT + sceneText }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) throw new Error('Scene analysis failed');

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      narrativeType: parsed.narrativeType || 'static',
      temporalComplexity: parsed.temporalComplexity || 'simple',
      suggestedPromptCount: parsed.suggestedPromptCount || 3,
      entityReferences: [],
      reasoning: parsed.reasoning,
    };
  } catch (e) {
    console.error('Failed to parse scene analysis', e);
    return {
      narrativeType: 'static',
      temporalComplexity: 'simple',
      suggestedPromptCount: 3,
      entityReferences: [],
    };
  }
}

export function matchEntitiesToScene(
  sceneText: string,
  allEntities: ExtractedEntity[]
): string[] {
  const lowerSceneText = sceneText.toLowerCase();
  return allEntities
    .filter(entity => lowerSceneText.includes(entity.name.toLowerCase()))
    .map(entity => entity.id);
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end);
      if (lastParagraph > start) end = lastParagraph;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

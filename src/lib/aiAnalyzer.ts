import { ENTITY_EXTRACTION_PROMPT, SCENE_ANALYSIS_PROMPT } from './analysisPrompts';
import { aiProvider } from './aiProvider';
import type { ExtractedEntity, SceneAnalysis } from '@/types';

export async function extractEntitiesFromText(
  text: string,
  _apiKey?: string,
  _model?: string
): Promise<ExtractedEntity[]> {
  const chunks = splitTextIntoChunks(text, 30000);
  const allEntities: ExtractedEntity[] = [];
  let entityCounter = 0;

  for (const chunk of chunks) {
    const content = await aiProvider.generateContent(ENTITY_EXTRACTION_PROMPT + chunk);

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
  _apiKey?: string,
  _model?: string
): Promise<Omit<SceneAnalysis, 'sceneId'>> {
  const content = await aiProvider.generateContent(SCENE_ANALYSIS_PROMPT + sceneText);

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      narrativeType: parsed.narrativeType || 'static',
      temporalComplexity: parsed.temporalComplexity || 'simple',
      suggestedPromptCount: parsed.suggestedPromptCount || 3,
      timelapseStages: Array.isArray(parsed.timelapseStages) ? parsed.timelapseStages : undefined,
      timelapseAnchor: parsed.timelapseAnchor && typeof parsed.timelapseAnchor === 'object'
        ? parsed.timelapseAnchor
        : undefined,
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

import type { Scene, SubScene, ConsistencyGroup, ExtractedEntity, SceneAnalysis } from '@/types';
import { detectContext } from './contextDetection';

const DEFAULT_SYSTEM_PROMPT = `You are a cinematic image prompt generator for AI video/image generation tools. Your task is to create detailed, production-ready prompts that can be used with tools like Midjourney, DALL-E, or Runway.

CORE PRINCIPLES:
- Generate prompts ONLY for what the scene text explicitly describes
- Maintain visual consistency when character/location descriptions are provided
- Adapt to narrative type: static moments vs. temporal sequences
- Each prompt must be self-contained and technically detailed

ANIMATION-FRIENDLY COMPOSITION (for AI video generation):
- Maximum 3 subjects per frame
- Prefer static or slow single-direction movement
- Avoid: complex crowd scenes, flowing water/fabric, particle effects
- Use shallow depth of field to isolate subjects
- Simple geometric backgrounds

TECHNICAL SPECIFICATIONS:
- Specify camera: ARRI Alexa, RED, or equivalent cinema camera
- Include lens type and focal length
- Describe lighting: soft/hard, direction, color temperature
- Define color palette and mood
- Shot type: wide/medium/close-up, static/slow push

OUTPUT FORMAT:
PROMPT_1: [shot type] | [detailed prompt paragraph, 90-130 words]
PROMPT_2: [shot type] | [detailed prompt paragraph, 90-130 words]
...

When CHARACTER DESCRIPTIONS provided: maintain exact physical details, clothing, age across all prompts.
When LOCATION DESCRIPTIONS provided: preserve architectural style, geographic features, historical period.
When NARRATIVE TYPE is "timelapse": show progression/change across multiple prompts.

Generate {N} distinct cinematic image prompts in English.`;

export const DEFAULT_SYSTEM_PROMPT_DISPLAY = DEFAULT_SYSTEM_PROMPT;

export function loadSystemPrompt(): string {
  try {
    return localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT;
  } catch { return DEFAULT_SYSTEM_PROMPT; }
}

export function saveSystemPrompt(prompt: string): void {
  localStorage.setItem('system_prompt', prompt);
}

/**
 * Extracts the relevant section from the 5N1K document for a given episode title.
 * @deprecated No longer used — retained only for backward compatibility during migration.
 */
export function extract5N1KSection(_text5N1K: string, _episodeTitle: string): string {
  return '';
}

interface GenerateOptions {
  scene: Scene;
  apiKey: string;
  model: string;
  variantCount: number;
  temperature: number;
  consistencyGroups?: ConsistencyGroup[];
  allScenes?: Scene[];
  // Sub-scene support
  subScene?: SubScene;
  parentScene?: Scene;
  parentConsistencyGroups?: ConsistencyGroup[];
  // AI-extracted entity context
  sceneEntities?: { characters: ExtractedEntity[]; locations: ExtractedEntity[] };
  sceneAnalysis?: SceneAnalysis;
}

export async function generatePrompts(opts: GenerateOptions & { systemPrompt?: string; signal?: AbortSignal }): Promise<{ shotType: string; text: string; summary?: string }[]> {
  const { scene, apiKey, model, variantCount, temperature, consistencyGroups, allScenes, systemPrompt: customPrompt, subScene, parentScene, parentConsistencyGroups, sceneEntities, sceneAnalysis } = opts;

  const isSubScene = !!subScene && !!parentScene;

  const context = detectContext(scene.episodeTitle);
  const sceneText = isSubScene
    ? subScene!.segments.map(s => s.text).join('\n\n')
    : scene.segments.map(s => s.text).join('\n\n');
  const refText = isSubScene
    ? subScene!.subjectReferences.map(s => s.text).join('\n') || scene.subjectReferences.map(s => s.text).join('\n')
    : scene.subjectReferences.map(s => s.text).join('\n');

  let userMessage = `EPISODE: ${scene.episodeTitle}\nCONTEXT: ${context}\n\n`;

  // Add AI-extracted entity descriptions
  if (sceneEntities?.characters && sceneEntities.characters.length > 0) {
    userMessage += `CHARACTERS IN THIS SCENE:\n`;
    sceneEntities.characters.forEach(char => {
      userMessage += `- ${char.name}: ${char.visualDescription}\n`;
    });
    userMessage += '\n';
  }

  if (sceneEntities?.locations && sceneEntities.locations.length > 0) {
    userMessage += `LOCATIONS IN THIS SCENE:\n`;
    sceneEntities.locations.forEach(loc => {
      userMessage += `- ${loc.name}: ${loc.visualDescription}\n`;
    });
    userMessage += '\n';
  }

  if (sceneAnalysis) {
    userMessage += `NARRATIVE ANALYSIS:\n`;
    userMessage += `- Type: ${sceneAnalysis.narrativeType}\n`;
    userMessage += `- Complexity: ${sceneAnalysis.temporalComplexity}\n`;
    userMessage += `- Recommended prompts: ${sceneAnalysis.suggestedPromptCount}\n\n`;
  }

  if (refText) {
    userMessage += `SUBJECT REFERENCE: ${refText}\n\n`;
  }

  // If sub-scene: include parent scene context
  if (isSubScene) {
    const parentText = parentScene!.segments.map(s => s.text).join('\n\n');
    userMessage += `PARENT SCENE (full sentence — maintain visual continuity): ${parentText}\n\n`;
    userMessage += `SUB-SCENE FOCUS (generate prompts for this specific element only): ${subScene!.label}\n`;
    userMessage += `SUB-SCENE TEXT: ${sceneText}\n\n`;

    // Parent scene note
    if (parentScene!.note?.trim()) {
      userMessage += `PARENT SCENE NOTE (applies to all sub-scenes): ${parentScene!.note.trim()}\n\n`;
    }
    // Sub-scene own note
    if (subScene!.note?.trim()) {
      userMessage += `SUB-SCENE NOTE (director's instruction — apply strictly): ${subScene!.note.trim()}\n\n`;
    }

    // Parent consistency groups
    if (parentConsistencyGroups && parentConsistencyGroups.length > 0 && allScenes) {
      for (const cg of parentConsistencyGroups) {
        const otherSceneNums = cg.sceneIds
          .filter(id => id !== scene.id)
          .map(id => allScenes.findIndex(s => s.id === id) + 1)
          .filter(n => n > 0);
        if (otherSceneNums.length > 0) {
          let groupLine = `PARENT CONSISTENCY GROUP ${cg.label} (inherited) — maintain visual consistency with scenes ${otherSceneNums.join(', ')}`;
          if (cg.note?.trim()) groupLine += `\n  Group note: ${cg.note.trim()}`;
          userMessage += groupLine + '\n';
        }
      }
      userMessage += '\n';
    }

    // Sub-scene own consistency groups
    if (consistencyGroups && consistencyGroups.length > 0 && allScenes) {
      for (const cg of consistencyGroups) {
        const otherSceneNums = cg.sceneIds
          .filter(id => id !== scene.id)
          .map(id => allScenes.findIndex(s => s.id === id) + 1)
          .filter(n => n > 0);
        if (otherSceneNums.length > 0) {
          let groupLine = `SUB-SCENE CONSISTENCY GROUP ${cg.label} — maintain consistency with scenes ${otherSceneNums.join(', ')}`;
          if (cg.note?.trim()) groupLine += `\n  Group note: ${cg.note.trim()}`;
          userMessage += groupLine + '\n';
        }
      }
      userMessage += '\n';
    }
  } else {
    // Normal scene flow
    if (consistencyGroups && consistencyGroups.length > 0 && allScenes) {
      for (const cg of consistencyGroups) {
        const otherSceneNums = cg.sceneIds
          .filter(id => id !== scene.id)
          .map(id => allScenes.findIndex(s => s.id === id) + 1)
          .filter(n => n > 0);
        if (otherSceneNums.length > 0) {
          let groupLine = `CONSISTENCY GROUP ${cg.label} — maintain visual consistency with scenes ${otherSceneNums.join(', ')}`;
          if (cg.note?.trim()) groupLine += `\n  Group note: ${cg.note.trim()}`;
          userMessage += groupLine + '\n';
        }
      }
      userMessage += '\n';
    }
    if (scene.note?.trim()) {
      userMessage += `SCENE NOTE (director's instruction — apply strictly): ${scene.note.trim()}\n\n`;
    }
    userMessage += `SCENE TEXT:\n${sceneText}\n\n`;
  }

  userMessage += `Generate ${variantCount} cinematic image prompts.

IMPORTANT: Respond in this EXACT format (JSON):
{
  "prompts": [
    {
      "summary": "TURKISH 1-sentence description of the image (e.g., 'Boğaz kıyısında sabah manzarası')",
      "shotType": "Shot type in English (e.g., 'Wide Shot', 'Close-up', 'Medium Shot')",
      "prompt": "Full ENGLISH prompt text, 80-120 words with technical details"
    }
  ]
}

If you cannot use JSON format, use the pipe format instead:
PROMPT_1: [shot type] | [prompt text]`;

  const basePrompt = customPrompt || loadSystemPrompt();
  const systemPrompt = basePrompt.replace('{N}', String(variantCount));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (response.status === 429 || response.status === 403) {
    throw new Error('RATE_LIMIT');
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parsePromptResponse(content, variantCount);
}

/**
 * Revise a prompt via API.
 * Special case: if instruction starts with __RESTORE__:: the text after is returned directly
 * (no API call) — used for reverting to a previous version from history.
 */
export async function revisePrompt(
  originalPrompt: string,
  revisionInstruction: string,
  apiKey: string,
  model: string,
  temperature: number,
): Promise<string> {
  // Version restore — no API call needed
  if (revisionInstruction.startsWith('__RESTORE__::')) {
    return revisionInstruction.slice('__RESTORE__::'.length);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: 'You are a cinematographer revising image generation prompts. Apply the revision to the prompt while maintaining the same format and quality. Output ONLY the revised prompt text, nothing else.' }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Original prompt:\n${originalPrompt}\n\nRevision instruction:\n${revisionInstruction}\n\nOutput the revised prompt only.` }],
      }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    }),
  });

  if (response.status === 429) throw new Error('RATE_LIMIT');
  if (!response.ok) throw new Error(`API Error ${response.status}`);

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || originalPrompt;
}

function parsePromptResponse(content: string, expected: number): { shotType: string; text: string; summary?: string }[] {
  // Try JSON format first
  try {
    const jsonMatch = content.match(/\{[\s\S]*"prompts"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
        return parsed.prompts.map((p: { shotType?: string; prompt?: string; summary?: string }) => ({
          shotType: p.shotType || 'General',
          text: p.prompt || '',
          summary: p.summary,
        })).filter((p: { text: string }) => p.text);
      }
    }
  } catch { /* fall through to pipe format */ }

  // Fall back to pipe format
  const results: { shotType: string; text: string; summary?: string }[] = [];
  const regex = /PROMPT_\d+:\s*([^|]+)\|\s*([\s\S]*?)(?=PROMPT_\d+:|$)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    results.push({
      shotType: match[1].trim().replace(/^\[|\]$/g, ''),
      text: match[2].trim(),
    });
  }

  if (results.length === 0) {
    results.push({ shotType: 'General', text: content.trim() });
  }

  return results;
}

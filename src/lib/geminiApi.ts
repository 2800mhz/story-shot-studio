import type { Scene, SubScene, ConsistencyGroup } from '@/types';
import { detectContext } from './contextDetection';

const DEFAULT_SYSTEM_PROMPT = `You are a senior cinematographer and visual storytelling expert creating detailed image generation prompts for a Central Asian historical documentary series.

TASK: Generate {N} distinct, richly detailed cinematic image prompts in English.

STRICT RULES:
1. Write ONLY in English
2. Base on real historical/archaeological evidence:
   - Penjikent frescoes, Afrasiab murals, period manuscripts
   - Accurate Central Asian phenotypes (NOT Middle Eastern or Saharan)
   - Authentic Silk Road material culture, costumes, architecture
3. Camera: ARRI Alexa 65 with specific named lens (e.g. Zeiss Master Prime 35mm T1.3) and aperture
4. Lighting: naturalistic documentary only — describe exact quality, direction, and colour temperature of light
5. Color palette: ochre, raw umber, dusty grey, pale blue sky; describe colour grading precisely
6. No romanticization, no Hollywood drama — photographic realism
7. Each prompt must be a RICH, DETAILED, COMPLETE paragraph of 150–250 words minimum, covering: shot framing, subject description, environment/background, lighting, texture, mood, camera movement if any
8. Shot types must be DIFFERENT for each prompt
9. Describe every visible surface, material, fabric texture, skin tone, facial expression, depth of field
10. Include atmospheric details: dust particles, heat haze, shadow patterns, architectural decay, vegetation

IF a SUBJECT REFERENCE is provided:
- That character/subject must appear in ALL prompts
- Keep exact same: phenotype, clothing details, age, physical features, scars, accessories
- Describe them with full specificity every time

IF a CONSISTENCY GROUP is indicated:
- Note the group at start of each prompt: [GROUP_X]
- Maintain exact same: lighting conditions, time of day, sun angle, colour grade,
  background geography, production design across ALL prompts in this group

OUTPUT FORMAT — use EXACTLY this structure, nothing else before or after:
PROMPT_1: [shot type label] | [full detailed prompt text]
PROMPT_2: [shot type label] | [full detailed prompt text]
PROMPT_3: [shot type label] | [full detailed prompt text]`;

export const DEFAULT_SYSTEM_PROMPT_DISPLAY = DEFAULT_SYSTEM_PROMPT;

export function loadSystemPrompt(): string {
  try {
    return localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT;
  } catch { return DEFAULT_SYSTEM_PROMPT; }
}

export function saveSystemPrompt(prompt: string): void {
  localStorage.setItem('system_prompt', prompt);
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
}

export async function generatePrompts(opts: GenerateOptions & { systemPrompt?: string }): Promise<{ shotType: string; text: string }[]> {
  const { scene, apiKey, model, variantCount, temperature, consistencyGroups, allScenes, systemPrompt: customPrompt, subScene, parentScene, parentConsistencyGroups } = opts;

  const isSubScene = !!subScene && !!parentScene;

  const context = detectContext(scene.episodeTitle);
  const sceneText = isSubScene
    ? subScene!.segments.map(s => s.text).join('\n\n')
    : scene.segments.map(s => s.text).join('\n\n');
  const refText = isSubScene
    ? subScene!.subjectReferences.map(s => s.text).join('\n') || scene.subjectReferences.map(s => s.text).join('\n')
    : scene.subjectReferences.map(s => s.text).join('\n');

  let userMessage = `EPISODE: ${scene.episodeTitle}\nCONTEXT: ${context}\n\n`;

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

  userMessage += `Generate ${variantCount} cinematic image prompts.`;

  const basePrompt = customPrompt || loadSystemPrompt();
  const systemPrompt = basePrompt.replace('{N}', String(variantCount));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (response.status === 429) {
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

export async function revisePrompt(
  originalPrompt: string,
  revisionInstruction: string,
  apiKey: string,
  model: string,
  temperature: number,
): Promise<string> {
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

export async function generateImage(
  promptText: string,
  apiKey: string,
  model: string,
): Promise<string> {
  const imagePrompt = `Generate a cinematic 16:9 aspect ratio documentary image based on this description. Ultra high resolution, photorealistic, ARRI Alexa 65 quality:\n\n${promptText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (response.status === 429) throw new Error('RATE_LIMIT');
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Image API Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  
  for (const part of parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('API yanıtında görüntü bulunamadı');
}

function parsePromptResponse(content: string, expected: number): { shotType: string; text: string }[] {
  const results: { shotType: string; text: string }[] = [];
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

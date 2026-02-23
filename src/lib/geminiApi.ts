import type { Scene, SubScene, ConsistencyGroup } from '@/types';
import { detectContext } from './contextDetection';

const DEFAULT_SYSTEM_PROMPT = `You are a specialist historical documentary cinematographer and anthropological image consultant creating archaeologically and historically rigorous prompts for a documentary series about the Ata-Beyit National History and Memorial Complex, Chong-Tash village, Kyrgyzstan.

The documentary narrates in the voice of the memorial site itself, covering:
- 1938 Stalinist purge period — 137 Kyrgyz intellectuals executed and buried
- 1991 discovery period — collapse of USSR, Bübüyra Kıdıraliyeva's revelation
- Present day — the memorial complex as living site of memory
- Literary-spiritual layer — Chingiz Aitmatov, Törekül Aitmatov, the weight of language and remembrance

These images will be ANIMATED using AI video generation. All prompts must be optimized for temporal consistency and predictable motion synthesis.

TASK: Generate {N} distinct cinematic image prompts in English.

═══════════════════════════════════════════
SECTION 1 — ANIMATION-FIRST COMPOSITION RULES
═══════════════════════════════════════════

STRICTLY FORBIDDEN (unpredictable for AI animation):
- Groups larger than 3-4 figures in a single frame
- Flowing water, splashing, liquid in motion
- Fire or flame in motion (embers and ash at rest: permitted)
- Fabric billowing or wind-blown cloth
- Airborne dust or particle explosions
- Multiple simultaneous moving subjects
- Complex multi-hand gestures
- Animals in dynamic movement
- Extreme open-mouthed expressions

PREFERRED for animation stability:
- 1-3 subjects maximum per frame
- Slow deliberate single-direction movement or fully static pose
- Strong horizon line, simple geometric background
- Shallow depth of field — isolates subject, reduces background motion complexity
- Subjects facing consistent direction across related prompts
- Clear figure-ground separation

CAMERA MOTION:
- Slow push-in OR static lock-off only
- Drone/aerial: descending or ascending only, no lateral sweep
- No handheld simulation, no whip pans

═══════════════════════════════════════════
SECTION 2 — HISTORICAL ACCURACY BY TIME LAYER
═══════════════════════════════════════════

── LAYER A: 1938 — STALINIST PURGE PERIOD ──

APPROACH: Indirect and symbolic only. NO execution scenes, NO explicit violence, NO bodies. Suggest presence, absence, and dread through environment and objects alone.

Permitted visual language for 1938:
- Empty landscape at dusk or pre-dawn, disturbed earth, shallow depressions in ground
- Single abandoned personal object: a book, a pen, a folded piece of paper, a leather boot
- Soviet-era NKVD material culture: dark wool greatcoat draped over object (no face visible), leather briefcase, period-correct documents with Cyrillic stamps
- Atmospheric: long single shadow on ground, dim overcast sky, frost on grass
- If figure present: seen only from behind or in extreme silhouette, never facing camera

1938 MATERIAL CULTURE accuracy:
- NKVD uniform: dark navy/black wool greatcoat, peaked cap with red band, leather belt — no visible insignia in close-up
- Kyrgyz intellectual dress 1930s: Soviet-influenced — collarless linen shirt, dark wool trousers, simple leather shoes or boots, some wearing traditional kalpak felt hat in white
- Setting: rural Kyrgyz steppe, pre-dawn darkness, overcast, frost possible in late autumn
- NO anachronistic elements: no synthetic fabrics, no modern equipment

── LAYER B: 1991 — DISCOVERY AND RECKONING ──

APPROACH: Documentary realism. The moment of historical truth emerging from silence.

1991 visual context:
- Post-Soviet Kyrgyz steppe, late autumn, overcast grey sky
- Figures: Kyrgyz women and men in 1991 civilian dress — wool coats, headscarves, Soviet-era practical clothing, weathered faces showing age and grief
- Bübüyra Kıdıraliyeva: elderly Kyrgyz woman, traditional dress with headscarf, weathered hands, expression of solemn resolve — never sensationalized
- Archaeological moment: hands carefully uncovering earth, simple tools, soil disturbed
- Official presence: government representatives in dark coats, notebooks
- Emotion: restrained grief, dignified witness — NOT dramatic weeping

1991 FORBIDDEN: modern smartphones, bright synthetic colors, any post-2000 visual elements

── LAYER C: PRESENT DAY — THE MEMORIAL COMPLEX ──

Architectural accuracy — Ata-Beyit as built:
- Open-air memorial site, Chong-Tash village, Chuy Valley, Kyrgyzstan
- Central memorial structure: modernist stone and concrete, angular forms
- Carved stone stelae with names and Kyrgyz script
- Eternal flame installation (show as still ember glow, NOT active flame)
- Surrounding landscape: flat to gently rolling Kyrgyz steppe, Tian Shan mountain silhouette on southern horizon
- Seasonal vegetation: dry golden grass, sparse trees, grey-green shrubs
- Sky: frequently overcast or pale grey-blue, high altitude light quality

Present-day figures if included:
- Solitary visitor in contemplation — seen from distance or from behind
- Elderly Kyrgyz woman placing flowers — slow deliberate movement only
- Maximum 2 figures per frame

── LAYER D: LITERARY-SPIRITUAL LAYER — AITMATOV ──

Visual language for Chingiz Aitmatov references:
- Books, manuscript pages, handwritten Kyrgyz and Russian text — static close-up
- A single red cloth or scarf — still, not wind-blown (reference: Kırmızı Eşarp / Red Headband)
- Open steppe landscape at dawn or dusk — vast, empty, contemplative
- A child's silhouette seen from distance on steppe — static or very slow walk
- Writing implements: ink pen on paper, typewriter — static macro shots
- NO literal illustrations of novel scenes — symbolic only

═══════════════════════════════════════════
SECTION 3 — ETHNOGRAPHIC ACCURACY
═══════════════════════════════════════════

KYRGYZ PHENOTYPE:
- Central Asian Turkic type: broad face, high cheekbones, epicanthic fold prominent, flat nasal bridge, dark almond eyes, straight black or dark brown hair
- Skin: medium bronze-olive, weathered by high-altitude steppe climate
- Body: medium build, physically resilient
- SOURCE: Kyrgyz anthropological studies, Soviet-era ethnographic photography, Manas epic manuscript illustrations
- FORBIDDEN: Arab/Semitic features, Sub-Saharan features, European features, exaggerated East Asian caricature

═══════════════════════════════════════════
SECTION 4 — CINEMATIC STANDARDS
═══════════════════════════════════════════

CAMERA: ARRI Alexa 65 — specify lens name, focal length, and aperture in every prompt

LENSES PERMITTED: Zeiss Supreme Prime, Cooke S4/i, Leica Summilux-C, Angenieux Optimo, Canon K35 vintage

LIGHTING BY LAYER:
- 1938 layer: pre-dawn or deep dusk, near-zero ambient, single cold directional source (moon or distant lantern), deep shadow, blue-black palette
- 1991 layer: flat overcast daylight, grey diffused, no shadows, muted and cold
- Present day: variable — overcast preferred, occasional golden hour for emotional weight
- Literary layer: dawn or dusk, contemplative low light

COLOR PALETTE BY LAYER:
- 1938: near-monochrome — blue-black shadow, cold grey, single warm amber accent maximum
- 1991: desaturated grey-green, dark wool coats, pale winter grass, grey sky
- Present day: cool grey stone, pale steppe gold, dark Tian Shan silhouette, muted sky
- Literary: vast pale gold steppe, grey-blue sky, single red accent

AESTHETIC REFERENCES:
- Elem Klimov (Come and See) — shadow and implied horror without explicitness
- Andrei Tarkovsky — slow contemplative framing, objects as memory vessels
- Sebastião Salgado — dignified portraiture of grief
- Chingiz Aitmatov's own prose rhythm — vast landscape, small human figure

NO romanticization, NO heroic poses, NO dramatic backlighting on faces

═══════════════════════════════════════════
SECTION 5 — RECURRING ELEMENTS (maintain across prompts)
═══════════════════════════════════════════

THE MEMORIAL STONE: grey granite stelae with carved Kyrgyz script names, weathered surface, lichen at base — preserve exact texture across prompts

BÜBÜYRA: elderly Kyrgyz woman, 60s-70s, traditional dark wool dress with patterned headscarf in muted burgundy and grey, deeply lined face showing decades of carried knowledge, hands weathered and large — always depicted with dignity, never as spectacle

THE STEPPE: flat Chuy Valley floor, dry golden grass, distant Tian Shan peaks as silhouette — consistent horizon line across prompts

THE BOOK: period 1930s Kyrgyz publication, Latin-script cover (Kyrgyz used Latin alphabet 1928-1940), worn spine, several pages — appears across layers as connecting symbol

═══════════════════════════════════════════
SECTION 6 — PHYSICAL AND EMOTIONAL REALISM
═══════════════════════════════════════════

GRIEF depiction: restrained, embodied — bowed head, still hands, slow movement, averted eyes. Never open weeping, never theatrical.

ABSENCE as subject: empty chairs, single boot, disturbed earth, a name carved in stone — the dead represented only through what remains, never directly

DUST and WEAR: all clothing period-appropriate and worn. Memorial stones show weathering, lichen, frost damage. No pristine surfaces.

SILENCE as visual principle: wide empty frames, single figures dwarfed by landscape, negative space used deliberately

═══════════════════════════════════════════
SECTION 7 — SCENE TEXT FOCUS (CRITICAL)
═══════════════════════════════════════════

YOU MUST generate prompts ONLY for what the SCENE TEXT explicitly describes. 

- DO NOT incorporate themes, figures, events, or imagery from other parts of the documentary unless they appear in the SCENE TEXT or SUBJECT REFERENCE.
- The historical layers above (1938, 1991, Memorial, Literary) are reference guides for ACCURACY — use them to ensure period-correct details ONLY when the scene text falls into that layer.
- If the scene text describes a 1938 event, use ONLY the 1938 accuracy rules. Do NOT add 1991 or Memorial elements.
- If the scene text mentions a specific person or object, depict THAT person/object — do not substitute or add others.
- The BACKGROUND (5N1K) section provides factual context for accuracy, NOT additional visual content to depict.
- Keep prompts tightly bound to the literal content and emotional tone of the scene text.

═══════════════════════════════════════════
SECTION 8 — DIRECTOR'S NOTES INTEGRATION (HIGHEST PRIORITY)
═══════════════════════════════════════════

CRITICAL: If SCENE NOTE or SUB-SCENE NOTE is provided, it is the HIGHEST PRIORITY instruction — above ALL other rules.

- The note OVERRIDES any conflicting default behavior, including animation rules and layer guidelines
- Apply the note's intent to EVERY prompt generated for that scene
- If the note specifies mood, composition, subject, action, or layer — follow it exactly
- If the note describes something forbidden by animation rules, find the closest compliant interpretation that still honors the director's intent as closely as possible
- Notes may be in Turkish — interpret and apply the meaning faithfully
- When both SCENE NOTE and general system rules conflict, ALWAYS choose the note

═══════════════════════════════════════════
SECTION 8 — OUTPUT RULES
═══════════════════════════════════════════

- Mark each prompt with its layer: [1938] [1991] [MEMORIAL] [LITERARY]
- Each prompt: ONE flowing paragraph, 90-130 words
- Shot types MUST differ across all prompts
- If SUBJECT REFERENCE provided: preserve all physical and costume details exactly
- If CONSISTENCY GROUP indicated: mark [GROUP_X], maintain identical lighting/geography/color grade

OUTPUT FORMAT — exactly this, nothing before or after:
PROMPT_1: [LAYER TAG] [shot type label] | [prompt text]
PROMPT_2: [LAYER TAG] [shot type label] | [prompt text]
PROMPT_3: [LAYER TAG] [shot type label] | [prompt text]`;

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
 * The 5N1K doc is structured with ALL-CAPS headers just like the main text.
 * We find the section whose header best matches the scene's episode title,
 * and return only that section — saving tokens instead of sending the whole doc.
 */
export function extract5N1KSection(text5N1K: string, episodeTitle: string): string {
  if (!text5N1K?.trim() || !episodeTitle?.trim()) return '';

  const lines = text5N1K.split('\n');
  const upperTitle = episodeTitle.toUpperCase();

  // Find keywords from the episode title (words longer than 3 chars)
  const titleWords = upperTitle.split(/\s+/).filter(w => w.length > 3);

  // Score each line as a potential header by how many title keywords it contains
  let bestHeaderIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toUpperCase();
    if (line.length < 3 || line.length > 120) continue;
    // Must look like a header (short ALL-CAPS line)
    const isHeaderLike = line === line.replace(/[^A-ZÇĞİÖŞÜa-zçğışöü0-9\s\-–:]/g, '') &&
      line.split(' ').length < 10;
    if (!isHeaderLike) continue;

    const score = titleWords.filter(w => line.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestHeaderIdx = i;
    }
  }

  if (bestHeaderIdx === -1 || bestScore === 0) {
    // No specific section found — return first 800 chars as general context
    return text5N1K.slice(0, 800);
  }

  // Find the next header after bestHeaderIdx to delimit the section
  let nextHeaderIdx = lines.length;
  for (let i = bestHeaderIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 3 && line.length < 120 && line === line.toUpperCase() && /[A-ZÇĞİÖŞÜ]/.test(line)) {
      nextHeaderIdx = i;
      break;
    }
  }

  const sectionLines = lines.slice(bestHeaderIdx, nextHeaderIdx);
  const section = sectionLines.join('\n').trim();

  // Cap at ~1200 chars to keep token usage bounded
  return section.length > 1200 ? section.slice(0, 1200) + '…' : section;
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
  // 5N1K context — only the relevant section for this scene's episode
  relevant5N1KContext?: string;
}

export async function generatePrompts(opts: GenerateOptions & { systemPrompt?: string }): Promise<{ shotType: string; text: string }[]> {
  const { scene, apiKey, model, variantCount, temperature, consistencyGroups, allScenes, systemPrompt: customPrompt, subScene, parentScene, parentConsistencyGroups, relevant5N1KContext } = opts;

  const isSubScene = !!subScene && !!parentScene;

  const context = detectContext(scene.episodeTitle);
  const sceneText = isSubScene
    ? subScene!.segments.map(s => s.text).join('\n\n')
    : scene.segments.map(s => s.text).join('\n\n');
  const refText = isSubScene
    ? subScene!.subjectReferences.map(s => s.text).join('\n') || scene.subjectReferences.map(s => s.text).join('\n')
    : scene.subjectReferences.map(s => s.text).join('\n');

  let userMessage = `EPISODE: ${scene.episodeTitle}\nCONTEXT: ${context}\n\n`;

  // Inject only the relevant 5N1K section — token-efficient, API-friendly
  if (relevant5N1KContext?.trim()) {
    userMessage += `BACKGROUND (5N1K — Who/What/Where/When/Why for this episode):\n${relevant5N1KContext.trim()}\n\n`;
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

import type { SceneCard, Character, Location, TimeContext, PromptCard, PromptAnalysis, GenerationResult, SceneAnalysis, SceneReference, TimelapseStageInfo } from '@/types';
import { aiProvider } from './aiProvider';

const PROMPT_GENERATION_SYSTEM_PROMPT = `You are an elite cinematic prompt engineer for AI image generation tools (Midjourney, Runway, Flow AI).
Your prompts are used for documentary and historical films. Every image must feel like a frame from a real photograph or archival footage — not a fantasy, game, or Hollywood production.

TASK:
Analyze the scene and produce 3 DIFFERENT cinematic English prompts from different camera angles:
- Prompt 1: Wide Shot / Establishing Shot — environment, atmosphere, full context
- Prompt 2: Medium Shot — subject + action + immediate surroundings  
- Prompt 3: Close-up / Detail Shot — face, costume texture, expression

PROMPT LENGTH: 120-150 words each. Precise and specific.

ENTITY INTEGRATION (CRITICAL):
The === SCENE SETTING ===, === CHARACTER ===, and === LOCATION === blocks are your ONLY source of truth.
Do NOT invent, assume, or add anything not stated in these blocks.
Every field must appear verbatim in your prompts:
- Age, phenotype, facial features, hair, beard, clothing → write each explicitly
- Location terrain, sky, architecture, vegetation → describe exactly as given
- Time of day, lighting, weather → must match SCENE SETTING exactly
NEVER summarize. If the character has "deer-hide coat with bone talismans" — write it exactly so.

CHARACTER RECURRENCE (CRITICAL):
Every prompt (Wide, Medium, Close-up) must repeat ALL character physical attributes.
Do NOT assume the AI model remembers from Prompt 1.
Hair style, beard, headpiece, every garment — repeat in all 3 prompts.

NO ENTITY = NO FACE CLOSE-UP (CRITICAL):
If NO === CHARACTER === block is provided, the Close-up prompt MUST NOT show any human face.
Instead, for Prompt 3, depict an environmental or architectural detail: cracked stone, worn wood grain,
rust on metal, dust on cobblestones, a distant flag, a doorway, an object — anything but a face.
FORBIDDEN: inventing a random unnamed person and showing their face just to fill the close-up slot.
If there is no character entity, treat Prompt 3 as a "Detail / Texture / Object" shot, not a face shot.

DOCUMENTARY CANDID FEEL (CRITICAL — APPLIES TO ALL PROMPTS):
Every image must feel like a camera happened to be there and caught the real moment — not a posed portrait.
FORBIDDEN in every prompt:
- People posing for the camera
- Subjects looking directly into the lens (unless explicitly requested)
- Theater-stage compositions where everyone is arranged facing forward
- Still-life portrait lighting (flat studio look)
- Symmetrical "hero pose" arrangements
REQUIRED:
- Use verbs like: moving through, scanning the horizon, gesturing toward, leaning over, turning away, crouching
- Describe where subjects are looking: at the ground, toward the smoke, at each other, past the camera
- Add environmental motion cues: dust rising, fabric shifting in wind, smoke drifting
- Shoot from slightly off-angle, low or high vantage, as if the camera crew followed them in
- "Candid documentary frame", "caught-in-motion", "unposed street photography style" are valid descriptors

COLOR PALETTE CONSISTENCY (CRITICAL):
Within a single episode, if time of day and location have NOT significantly changed, the color palette must remain consistent.
- If the episode is set in morning/Istanbul, use the same warm golden light + stone-grey tones throughout
- Do NOT suddenly shift to cool blue, or bright noon, or deep orange just because a new scene starts
- Use the exact same color grading descriptors unless SCENE SETTING explicitly changes
- Suggested approach: if no time/location shift → repeat the same palette keywords from Prompt 1 of the episode

ANIMATION-FRIENDLY COMPOSITION:
- Maximum 3 subjects per frame
- Prefer static, tension-filled moments — NOT mid-motion blur
- Use shallow depth of field to isolate subjects
- Simple, uncluttered backgrounds preferred
- Avoid: complex crowd chaos, flowing particle effects

TECHNICAL SPECIFICATIONS:
- Camera: ARRI Alexa 35, RED Komodo, cinema camera
- Lens: 24mm wide, 50mm medium, 85mm close-up
- Depth of field: deep for wide, moderate for medium, shallow for close-up
- Lighting: must match the time of day in SCENE SETTING exactly
- Color grading: desaturated earth tones, naturalistic, documentary feel

SCENE SETTING RULE (HIGHEST PRIORITY):
- Time of day is absolute — "gece" means night, deep dark sky, stars, moonlight only. NO sunset, NO daylight.
- Location type is absolute — do not substitute terrain, architecture, or environment
- Period/era is absolute — costumes and architecture must match exactly
- NEVER override or reinterpret the Scene Setting

NATURAL EYES RULE:
- Eyes: natural, dark brown, with soft catchlights only
- FORBIDDEN: glowing eyes, lit-from-within, colored glowing pupils, laser eyes
- Face lighting: naturalistic, directional, or rim light only
- NEVER wash out skin texture with light

ANTHROPOLOGICAL & HISTORICAL ACCURACY (CRITICAL):
- NEVER base any figure on film, TV, or cinematic adaptations
- ALWAYS derive appearance from: period manuscripts, miniatures, coins, archaeological evidence
- Ethnic features must match the actual historical population of the region and era
- Clothing must reflect actual archaeological and iconographic evidence
- Architecture based on surviving examples and excavations
- Ottoman ≠ modern Turkish TV aesthetics
- Mongol ≠ European armor
- Central Asian Turkic ≠ generic East Asian

CROWD SCENES (5+ people):
- Use wide/extreme wide shot
- "Silhouetted figures" or "backlit crowd"
- Add "atmospheric haze" for depth
- Avoid detailed faces in crowd

TIMELAPSE / TRANSFORMATION:
- If hasTransformation=true: show 3 distinct static moments
- Prompt 1: before state, Prompt 2: mid-transition, Prompt 3: after state
- NEVER use motion verbs — describe static frozen moments

HISTORICAL FIGURE:
- Use illustrated/miniature painting style for faces
- Reference: period manuscripts, not film adaptations

SYMBOLIC SCENES (visualStyle = symbolic):
- Painterly, illustrated aesthetic based on the cultural tradition in entity blocks
- Reference: the specific manuscript or iconographic tradition of that culture
- Character and location details still apply
- Eyes remain natural — no glowing

END EVERY PROMPT WITH:
"anthropologically accurate, based on period manuscripts and historical paintings, not film or television adaptations, documentary realism."

RESPONSE FORMAT (JSON only, no markdown):
{
  "analysis": {
    "complexity": "low|medium|high|extreme",
    "difficultyScore": 1-10,
    "hasCrowd": boolean,
    "hasArchitecture": boolean,
    "hasTransformation": boolean,
    "hasHistoricalFigure": boolean,
    "recommendedStyle": "cinematic|illustrated|minimalist",
    "productionNotes": ["note1", ...]
  },
  "prompts": [
    {
      "shotType": "Wide Shot",
      "summary": "Turkish scene note (copy verbatim from input)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle, 'Bu görsel...' ile başla)",
      "prompt": "120-150 words, all entity fields embedded verbatim"
    },
    {
      "shotType": "Medium Shot",
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Türkçe açıklama (1 cümle)",
      "prompt": "120-150 words, full character and location detail"
    },
    {
      "shotType": "Close-up",
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Türkçe açıklama (1 cümle)",
      "prompt": "120-150 words, extreme facial and costume detail — OR texture/object detail if no CHARACTER entity"
    }
  ],
  "optimizations": ["optimization applied", ...]
}`;


const ASPECT_RATIO_HINTS: Record<string, string> = {
  '16:9': 'Landscape cinematic widescreen composition (16:9). Use horizontal space, rule of thirds, strong horizon lines.',
  '4:3': 'Classic 4:3 ratio composition. Balanced framing, centered subjects, traditional cinematic feel.',
  '1:1': 'Square 1:1 composition. Centered subject, symmetrical framing, social-media-friendly crop.',
  '9:16': 'Vertical portrait composition (9:16). Fill frame vertically, subject-forward, mobile-optimized framing.',
};

const aspectRatioGuide: Record<string, string> = {
  '16:9': 'widescreen cinematic format (landscape)',
  '4:3': 'classic film format (landscape)',
  '1:1': 'square format (social media)',
  '9:16': 'vertical format (mobile/TikTok/Instagram Stories)',
};

const compositionHints: Record<string, string> = {
  '16:9': 'Use horizontal composition, emphasize width, panoramic views',
  '4:3': 'Balanced composition, classic framing',
  '1:1': 'Centered composition, symmetrical framing',
  '9:16': 'Vertical composition, emphasize height, portrait orientation',
};

const DEFAULT_ANALYSIS: PromptAnalysis = {
  complexity: 'medium',
  difficultyScore: 5,
  hasCrowd: false,
  hasArchitecture: false,
  hasTransformation: false,
  hasHistoricalFigure: false,
  recommendedStyle: 'cinematic photorealistic',
  productionNotes: [],
};

export function analyzeSceneComplexity(
  sceneText: string,
  visualNote: string,
  characterCount: number
): Partial<PromptAnalysis> {
  const text = (sceneText + ' ' + visualNote).toLowerCase();

  const hasCrowd = characterCount >= 5 ||
    /kalabalık|crowd|group of people|çok kişi|insanlar|topluluk/.test(text);

  const hasArchitecture = /saray|kale|cami|kilise|bina|köprü|kule|palace|castle|mosque|church|building|bridge|tower|architecture/.test(text);

  const hasTransformation = /dönüş|transform|değiş|büyü|sihir|magic|morph|change|evolv|metamorf/.test(text);

  const hasHistoricalFigure = /sultan|padişah|hükümdar|kral|kraliçe|imparator|vezir|paşa|king|queen|emperor|historical|tarihsel/.test(text);

  let difficultyScore = 2;
  if (hasCrowd) difficultyScore += 3;
  if (hasTransformation) difficultyScore += 4;
  if (hasArchitecture) difficultyScore += 2;
  if (hasHistoricalFigure) difficultyScore += 2;
  difficultyScore = Math.min(difficultyScore, 10);

  let complexity: PromptAnalysis['complexity'] = 'low';
  if (difficultyScore >= 8) complexity = 'extreme';
  else if (difficultyScore >= 6) complexity = 'high';
  else if (difficultyScore >= 4) complexity = 'medium';

  const productionNotes: string[] = [];
  if (hasCrowd) productionNotes.push('⚠️ Kalabalık sahne tespit edildi: Wide shot + silhouette önerilir');
  if (hasTransformation) productionNotes.push('⚠️ Transformasyon tespit edildi: Multiple static scenes önerilir');
  if (hasArchitecture) productionNotes.push('🏛️ Mimari detay: Atmospheric haze kullanılabilir');
  if (hasHistoricalFigure) productionNotes.push('👑 Tarihsel figür: Illustrated/miniature style önerilir');

  return {
    complexity,
    difficultyScore,
    hasCrowd,
    hasArchitecture,
    hasTransformation,
    hasHistoricalFigure,
    recommendedStyle: hasHistoricalFigure || hasTransformation ? 'illustrated' : 'cinematic',
    productionNotes,
  };
}

export async function generatePromptsForScene(
  scene: SceneCard,
  characters: Character[],
  locations: Location[],
  masterPrompt: string,
  _apiKey?: string,
  _model?: string,
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '16:9',
  sceneAnalysis?: SceneAnalysis,
  timeContexts?: TimeContext[],
  episodePrompt?: string,
  references?: SceneReference[],
  generationType: 'initial' | 'regenerate' = 'initial',
  onRetry?: () => void
): Promise<GenerationResult> {
  let userMessage = `SAHNE METNİ:\n${scene.text}\n\n`;
  userMessage += `TÜRKÇE GÖRSEL NOT: "${scene.visualNote}"\n\n`;

  const styleNote = scene.visualStyle === 'symbolic'
    ? `\nVISUAL STYLE: This is a symbolic/metaphorical scene inspired by Central Asian Tengrist art traditions. 
Use painterly, ethereal aesthetics. Reference: Turkic shamanic iconography, Inner Asian manuscript 
illumination, cosmic symbolism. NOT photorealistic — more like a painted vision or dream sequence.
Avoid literal interpretation of metaphors.\n`
    : `\nVISUAL STYLE: Photorealistic, cinematic documentary style.\n`;

  userMessage += styleNote;

  // Karakter bilgilerini userMessage'ın EN BAŞINA ekle
  let entityHeader = '';

  if (characters.length > 0) {
    const individualChars = characters.filter(c => !c.isCrowd);

    if (individualChars.length === 1) {
      const char = individualChars[0];
      entityHeader += `=== CHARACTER TO DEPICT: ${char.name}${char.role ? ` (${char.role})` : ''} ===\n`;
      entityHeader += `⚠️ EMBED ALL OF THE FOLLOWING FIELDS VERBATIM INTO EVERY PROMPT. DO NOT OMIT OR SUMMARIZE ANY FIELD.\n`;
      if (char.age) entityHeader += `Age: ${char.age}\n`;
      if (char.ethnicity) entityHeader += `Phenotype/Ethnicity: ${char.ethnicity}\n`;
      if (char.physicalFeatures) entityHeader += `Facial features: ${char.physicalFeatures}\n`;
      if (char.hair) entityHeader += `Hair (color, length, style — describe exactly): ${char.hair}\n`;
      if (char.beard) entityHeader += `Beard/Facial hair (describe exactly): ${char.beard}\n`;
      if (char.clothing) entityHeader += `Costume (every garment and accessory — describe each): ${char.clothing}\n`;
      if (char.visualDescription) entityHeader += `Full visual description (integrate sentence by sentence): ${char.visualDescription}\n`;
      entityHeader += `⚠️ MAINTAIN THIS EXACT APPEARANCE ACROSS ALL 3 PROMPTS. ANY DEVIATION IS AN ERROR.\n\n`;

    } else if (individualChars.length > 1) {
      entityHeader += `=== MULTIPLE CHARACTERS IN THIS SCENE ===\n`;
      entityHeader += `Compose ALL characters in the SAME frame. Embed ALL fields of EACH character verbatim.\n\n`;
      individualChars.forEach((char, idx) => {
        const position = idx === 0 ? 'FOREGROUND' : idx === 1 ? 'MIDGROUND' : 'BACKGROUND';
        entityHeader += `[${position}] ${char.name}${char.role ? ` (${char.role})` : ''}:\n`;
        if (char.age) entityHeader += `  Age: ${char.age}\n`;
        if (char.ethnicity) entityHeader += `  Phenotype/Ethnicity: ${char.ethnicity}\n`;
        if (char.physicalFeatures) entityHeader += `  Facial features: ${char.physicalFeatures}\n`;
        if (char.hair) entityHeader += `  Hair: ${char.hair}\n`;
        if (char.beard) entityHeader += `  Beard/Facial hair: ${char.beard}\n`;
        if (char.clothing) entityHeader += `  Costume: ${char.clothing}\n`;
        if (char.visualDescription) entityHeader += `  Full description: ${char.visualDescription}\n`;
        entityHeader += `  ⚠️ MAINTAIN EXACT APPEARANCE.\n\n`;
      });
    }

    const crowds = characters.filter(c => c.isCrowd);
    if (crowds.length > 0) {
      entityHeader += '=== CROWD IN THIS SCENE ===\n';
      crowds.forEach(char => {
        entityHeader += `[CROWD] ${char.name}${char.role ? ` — ${char.role}` : ''}\n`;
        if (char.visualDescription) entityHeader += `Group appearance: ${char.visualDescription}\n`;
        entityHeader += '\n';
      });
    }
  }

  if (locations.length > 0) {
    if (locations.length === 1) {
      const loc = locations[0];
      entityHeader += `=== LOCATION TO DEPICT: ${loc.name} ===\n`;
      entityHeader += `⚠️ EMBED THIS LOCATION DESCRIPTION VERBATIM IN EVERY WIDE AND MEDIUM SHOT.\n`;
      if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
      entityHeader += `⚠️ THIS EXACT TERRAIN AND LANDSCAPE MUST APPEAR. NO SUBSTITUTION.\n\n`;
    } else if (locations.length > 1) {
      entityHeader += `=== MULTIPLE LOCATIONS IN THIS SCENE ===\n`;
      locations.forEach((loc, idx) => {
        const pos = idx === 0 ? 'PRIMARY' : 'SECONDARY';
        entityHeader += `[${pos} LOCATION] ${loc.name}:\n`;
        if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
        entityHeader += '\n';
      });
    }
  }

  // Agresif ışık ifadelerini yumuşat — "blinding", "supernatural" gibi kelimeler
  // Flow modelinde gözlerin beyaz parlak üretilmesine veya yüzün yıkanmasına yol açıyor.
  function sanitizeLighting(raw: string): string {
    return raw
      .replace(/\bblinding\b/gi, 'intense')
      .replace(/\bblinding white[- ]gold\b/gi, 'warm gold')
      .replace(/\bblinding white\b/gi, 'bright')
      .replace(/\bsupernatural stillness\b/gi, 'ethereal stillness')
      .replace(/\bsupernatural\b/gi, 'otherworldly')
      .replace(/\bethereal white[- ]gold\b/gi, 'soft gold')
      .replace(/\bcosmically bright\b/gi, 'softly luminous')
      .replace(/\bcosmically\b/gi, 'distantly')
      .replace(/\bwhite[- ]gold cosmic\b/gi, 'warm amber')
      .replace(/\bfrozen light\b/gi, 'still, quiet light')
      .replace(/\bglowing eyes\b/gi, 'natural eyes with soft catchlights')
      .replace(/\beyes.*?glow\b/gi, 'natural eyes with realistic reflections')
      .replace(/\bmystical glow\b/gi, 'soft ambient light')
      .replace(/\bspiritual light\b/gi, 'faint radiance')
      .replace(/\bhale\b/gi, 'subtle rim light')
      .replace(/\baura\b/gi, 'gentle illumination')
      .replace(/\bcosmic\b/gi, 'celestial');
  }

  // ZAMAN BAĞLAMI — entityHeader'ın EN BAŞINA eklenir, karakterden önce.
  // AI mesajı baştan okur; en kuvvetli kısıtı en üste koymak uyumu artırır.
  if (timeContexts && timeContexts.length > 0) {
    let timeHeader = `=== SCENE SETTING (CRITICAL — DO NOT IGNORE) ===\n`;
    timeContexts.forEach(tc => {
      timeHeader += `Time/Era: ${tc.label}${tc.era ? ` (${tc.era})` : ''}\n`;
      if (tc.timeOfDay) timeHeader += `Time of day: ${tc.timeOfDay} — THIS IS THE MANDATORY LIGHTING CONDITION\n`;
      if (tc.lighting) timeHeader += `Lighting: ${sanitizeLighting(tc.lighting)}\n`;
      if (tc.historicalNotes) timeHeader += `Historical context: ${tc.historicalNotes}\n`;
    });
    timeHeader += `⚠️ THE SCENE MUST BE SET IN THIS TIME AND LOCATION. DO NOT CHANGE TO DAY / SUNSET / FOREST / ROCKS.\n\n`;
    entityHeader = timeHeader + entityHeader;
  }

  // userMessage'ın en başına entityHeader'ı (zaman bağlamı dahil) ekle
  userMessage = entityHeader + userMessage;

  const additionalContext = '';

  // Inject References
  const subjectRefs = references?.filter(r => r.referenceType === 'subject') || [];
  const styleRefs = references?.filter(r => r.referenceType === 'style') || [];

  if (subjectRefs.length > 0) {
    userMessage += `\nSUBJECT REFERENCES:\n${subjectRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n`;
  }
  if (styleRefs.length > 0) {
    userMessage += `\nSTYLE REFERENCES:\n${styleRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n`;
  }

  // Episode prompt overrides/extends master prompt when present.
  // effectivePrompt = masterPrompt base + EPISODE STYLE OVERRIDE section on top.
  const effectivePrompt = episodePrompt
    ? `${masterPrompt}\n\nEPISODE STYLE OVERRIDE (apply on top of master rules above):\n${episodePrompt}`
    : masterPrompt;

  if (effectivePrompt) {
    userMessage += `MASTER PROMPT (tüm prompt'larda dikkate al):\n${effectivePrompt}\n\n`;
  }

  const compositionHint = ASPECT_RATIO_HINTS[aspectRatio] ?? ASPECT_RATIO_HINTS['16:9'];
  userMessage += `🎬 ASPECT RATIO: ${aspectRatio} (${aspectRatioGuide[aspectRatio] ?? aspectRatioGuide['16:9']})\n`;
  userMessage += `COMPOSITION HINT: ${compositionHints[aspectRatio] ?? compositionHints['16:9']}\n`;
  userMessage += `KOMPOZİSYON İPUCU: ${compositionHint}\n\n`;

  // Pass scene analysis hints from sceneAnalyzer if available
  if (sceneAnalysis) {
    userMessage += `🔍 SAHNE ANALİZİ (sceneAnalyzer sonucu):\n`;
    userMessage += `- narrativeType: ${sceneAnalysis.narrativeType}\n`;
    userMessage += `- temporalComplexity: ${sceneAnalysis.temporalComplexity}\n`;
    if (sceneAnalysis.narrativeType === 'timelapse') {
      userMessage += `- ⚠️ TIMELAPSE DETECTED: Her prompt farklı bir zaman dilimini göstermeli (başlangıç → geçiş → son durum)\n`;
    } else if (sceneAnalysis.narrativeType === 'sequence') {
      userMessage += `- ℹ️ SEQUENCE DETECTED: Prompts should show sequential stages of the event\n`;
    }
    userMessage += '\n';
  }

  const hasCharacters = characters.length > 0;
  const hasLocations = locations.length > 0;

  let focusDirective = '';

  if (!hasCharacters && hasLocations) {
    focusDirective = `
SCENE FOCUS: No characters in this scene. This is an ENVIRONMENT/ARCHITECTURE shot.
- Focus entirely on the location: texture, light, atmosphere, architectural detail
- Wide shot: establish the full scale and grandeur of the location
- Medium shot: focus on specific architectural or environmental details (doorways, walls, materials)
- Close-up: extreme texture detail (cracked mud-brick, carved stone, worn wood, dust)
- NO human figures unless absolutely necessary for scale
- Emphasize: time of day atmosphere, weathering, historical authenticity of materials
`;
  } else if (!hasCharacters && !hasLocations) {
    focusDirective = `
SCENE FOCUS: Abstract or narrative scene with no entities.
- Create atmospheric, evocative imagery based on the scene text and visual note only
- Wide shot: environmental establishing shot
- Medium shot: key symbolic object or environmental detail
- Close-up: texture, material, or symbolic detail
`;
  }

  if (focusDirective) {
    userMessage += focusDirective;
  }

  userMessage += `3 farklı açıdan sinematik prompt üret. Her prompt'ta "${scene.visualNote}" notunun ruhunu koru. Her prompt sonuna "--ar ${aspectRatio} --v 6" ekle.`;

  // Helper: try to parse the AI response as JSON, stripping any markdown fences first.
  function tryParseJSON(raw: string) {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  const content = await aiProvider.generateContent(userMessage, PROMPT_GENERATION_SYSTEM_PROMPT, {
    operationType: 'prompt_generation'
  });

  let parsed: {
    prompts?: Array<{ shotType?: string; summary?: string; explanation?: string; prompt?: string }>;
    analysis?: Partial<PromptAnalysis>;
    optimizations?: string[];
  };

  try {
    parsed = tryParseJSON(content);
  } catch (firstErr) {
    // First attempt failed — retry once with an explicit JSON-only reminder appended.
    console.error('[⚠️ promptGenerator] JSON parse failed on first attempt, retrying with JSON reminder...', firstErr);
    console.error('Malformed response:', content);
    onRetry?.();
    const retryMessage = userMessage + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.';
    const retryContent = await aiProvider.generateContent(retryMessage, PROMPT_GENERATION_SYSTEM_PROMPT, { operationType: 'prompt_generation_retry' });
    try {
      parsed = tryParseJSON(retryContent);
    } catch (secondErr) {
      console.error('[❌ promptGenerator] JSON parse failed after retry. Giving up.', secondErr);
      console.error('Malformed retry response:', retryContent);
      throw new Error('Invalid JSON in prompt response (after retry)');
    }
  }

  if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
    throw new Error('Invalid prompt response format');
  }

  const arSuffix = `--ar ${aspectRatio} --v 6`;

  const prompts: PromptCard[] = parsed.prompts.map((p, idx: number) => {
    const labels = ['Prompt A', 'Prompt B', 'Prompt C'];
    const types: Array<'wide' | 'medium' | 'closeup'> = ['wide', 'medium', 'closeup'];
    const rawPrompt = p.prompt || '';
    const promptText = /--ar\s+[\d:]+/.test(rawPrompt) ? rawPrompt : `${rawPrompt} ${arSuffix}`.trim();
    return {
      id: crypto.randomUUID(),
      type: types[idx] ?? 'wide',
      label: labels[idx] ?? `Prompt ${idx + 1}`,
      shotType: p.shotType || 'General',
      summary: p.summary || scene.visualNote,
      explanation: p.explanation || '',
      promptText,
      versions: [promptText],
      aspectRatio,
      generationType,
      hasSubjectReference: subjectRefs.length > 0,
    };
  });

  const rawAnalysis = parsed.analysis ?? {};
  const analysis: PromptAnalysis = {
    complexity: (rawAnalysis.complexity as PromptAnalysis['complexity']) ?? DEFAULT_ANALYSIS.complexity,
    difficultyScore: typeof rawAnalysis.difficultyScore === 'number' ? rawAnalysis.difficultyScore : DEFAULT_ANALYSIS.difficultyScore,
    hasCrowd: typeof rawAnalysis.hasCrowd === 'boolean' ? rawAnalysis.hasCrowd : DEFAULT_ANALYSIS.hasCrowd,
    hasArchitecture: typeof rawAnalysis.hasArchitecture === 'boolean' ? rawAnalysis.hasArchitecture : DEFAULT_ANALYSIS.hasArchitecture,
    hasTransformation: typeof rawAnalysis.hasTransformation === 'boolean' ? rawAnalysis.hasTransformation : DEFAULT_ANALYSIS.hasTransformation,
    hasHistoricalFigure: typeof rawAnalysis.hasHistoricalFigure === 'boolean' ? rawAnalysis.hasHistoricalFigure : DEFAULT_ANALYSIS.hasHistoricalFigure,
    recommendedStyle: typeof rawAnalysis.recommendedStyle === 'string' ? rawAnalysis.recommendedStyle : DEFAULT_ANALYSIS.recommendedStyle,
    productionNotes: Array.isArray(rawAnalysis.productionNotes) ? rawAnalysis.productionNotes : DEFAULT_ANALYSIS.productionNotes,
  };

  const optimizations: string[] = Array.isArray(parsed.optimizations) ? parsed.optimizations : [];

  return { prompts, analysis, optimizations };
}

const REVISION_SYSTEM_PROMPT = `You are an expert AI prompt engineer for cinematic visual generation (Midjourney, DALL-E, Stable Diffusion, etc).
Your task is to REVISE an existing English prompt based on a user instruction (which may be in Turkish).

RULES:
1. Preserve the original camera angle, lighting, and core composition of the prompt.
2. Seamlessly INTEGRATE the user's specific request into the existing scene.
3. Return ONLY the final revised English prompt. No explanations, no markdown fences, no quotes.
4. Keep all cinematic and technical terminology (--ar flags, etc.) intact.
5. If the user asks to remove something, remove it naturally without breaking the sentence structure.`;

export async function revisePrompt(
  originalPrompt: string,
  instruction: string,
  _apiKey?: string,
  model?: string,
  temperature?: number
): Promise<string> {
  const userMessage = `ORIGINAL PROMPT:\n${originalPrompt}\n\nUSER INSTRUCTION:\n"${instruction}"\n\nPlease provide the revised English prompt below:`;

  try {
    const rawContent = await aiProvider.generateContent(
      userMessage,
      REVISION_SYSTEM_PROMPT,
      { operationType: 'prompt_revision' }
    );

    // Clean up markdown fences or surrounding quotes the model might add
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    return cleaned.trim();
  } catch (error) {
    console.error('Failed to revise prompt:', error);
    throw error;
  }
}

// ─── AI Auto-Pin (Raptiye) System ────────────────────────────────────────────

const AUTO_PIN_SYSTEM_PROMPT = `Sen deneyimli bir belgesel film yapımcısı ve görsel kurgucu sun.
Sana bir sahne metni ve 3 farklı kamera açısından üretilmiş prompt verilecek.
Bu promptlar AI görsel üretim araçlarında (Flow, Midjourney) üretilecek ve sonra hareketlendirilecek.

Her promptu şu kriterlere göre değerlendir:

1. HAREKETLENDİRMEYE UYGUNLUK (EN ÖNEMLİ):
   - Az özne, sade kompozisyon tercih et
   - Statik veya tek yönlü yavaş hareket içeren sahneler daha uygun
   - Aşırı kalabalık, karmaşık kompozisyonlar UYGUN DEĞİL
   - Akan su, uçan partiküller, karmaşık kalabalık sahneler UYGUN DEĞİL

2. ANTROPOLOJİK DOĞRULUK:
   - Karakter fiziksel özellikleri, kıyafet detayları doğru mu?
   - Dönem ve kültüre uygun mu?

3. SİNEMATİK KALİTE:
   - Sahnenin duygusal ağırlığını yansıtıyor mu?
   - Güçlü kompozisyon ve ışık tarifi var mı?

4. ANLATIYA KATKI:
   - Hikayenin o anını en iyi hangisi yakalıyor?

SHOT TYPE ÖNCELİK SIRASI:
- Eğer sahne metni/görsel notu şunları içeriyorsa WIDE SHOT seç:
  ordu, süvari, kalabalık, şehir, sur, ufuk, meydan, panorama, uzak, istila, kuşatma
- Eğer şunları içeriyorsa MEDIUM SHOT seç:
  karşılaşma, diyalog, eylem, hareket, yürüyüş, at, savaş
- Eğer şunları içeriyorsa CLOSE-UP seç:
  yüz, göz, el, detay, doku, ifade, yakın

CLOSE-UP'I ASLA seçme eğer:
- Sahnede 3+ kişi/asker varsa
- Sahne bir mekan/şehir/doğa anlatıyorsa
- Görsel notta "ordu", "kalabalık", "sur", "şehir" gibi kelimeler varsa

VARSAYILAN: Eğer emin değilsen MEDIUM SHOT seç, CLOSE-UP değil.

SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{ "selectedIndex": 0, "reason": "Türkçe kısa gerekçe (max 1 cümle)" }
selectedIndex: 0 = ilk prompt, 1 = ikinci prompt, 2 = üçüncü prompt`;

/**
 * Uses AI to automatically select the best prompt for a scene card.
 * Acts as a "director/writer" evaluating cinematic, emotional, and narrative quality.
 * Returns the index (0-based) of the best prompt and a brief reasoning.
 */
export async function autoSelectBestPrompt(
  prompts: PromptCard[],
  sceneText: string,
  visualNote: string
): Promise<{ selectedIndex: number; reason: string }> {
  if (prompts.length === 0) return { selectedIndex: 0, reason: '' };
  if (prompts.length === 1) return { selectedIndex: 0, reason: 'Tek seçenek' };

  const promptList = prompts
    .map((p, i) => `[Prompt ${i + 1} — ${p.shotType}]\n${p.promptText}`)
    .join('\n\n');

  const userMessage = `SAHNE METNİ:\n${sceneText}\n\nTÜRKÇE GÖRSEL NOT: "${visualNote}"\n\nÜRETİLEN PROMPTLAR:\n${promptList}\n\nHangi prompt bu sahne için en etkili, en anlamlı ve kurguya en uygun? selectedIndex ve reason döndür.`;

  try {
    const rawContent = await aiProvider.generateContent(userMessage, AUTO_PIN_SYSTEM_PROMPT, { operationType: 'auto_pin_selection' });
    const cleaned = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { selectedIndex: number; reason: string };
    const idx = Number(parsed.selectedIndex);
    if (isNaN(idx) || idx < 0 || idx >= prompts.length) {
      return { selectedIndex: 0, reason: parsed.reason || '' };
    }
    return { selectedIndex: idx, reason: parsed.reason || '' };
  } catch (err) {
    console.warn('[autoSelectBestPrompt] Parse error, defaulting to first prompt:', err);
    return { selectedIndex: 0, reason: 'Varsayılan seçim' };
  }
}

// ─── Timelapse Sequence Generator ────────────────────────────────────────────

const TIMELAPSE_GENERATION_SYSTEM_PROMPT = `You are an elite cinematic prompt engineer for AI image generation tools (Midjourney, Runway, Flow AI).
Your prompts are used for documentary and historical films. Every image must feel like a frame from a real photograph or archival footage.

TIMELAPSE PROTOCOL:
You are generating a SERIES of independent prompts showing time progression through distinct stages.
Each stage is a STATIC FROZEN MOMENT at a specific point in time — NOT a motion shot.

STAGE COUNT RULE:
- Generate EXACTLY the number of prompts specified in the user message (stageCount)
- Each prompt corresponds to one stage in the time progression
- Stage numbers and labels are provided — use them exactly

STAGE CONSISTENCY (CRITICAL):
- Camera angle: IDENTICAL across all stages — same vantage point, same lens
- Location/terrain: IDENTICAL — same geography, same landmarks, same position
- Characters: IDENTICAL appearance if present (same clothing, same features)
- ONLY the time-progression element changes between stages (e.g. moon phase, building construction level, vegetation state)

STATIC FROZEN MOMENTS:
- Each prompt describes a STATIC frozen frame at that exact moment in time
- Use adjectives: "captured at this exact moment", "at this precise hour", "frozen in this stage"
- NEVER use motion verbs like "transitioning", "flowing", "morphing", "changing"
- No motion blur — still photography style

ENTITY INTEGRATION (CRITICAL):
The === SCENE SETTING ===, === CHARACTER ===, and === LOCATION === blocks are your ONLY source of truth.
Do NOT invent, assume, or add anything not stated in these blocks.
Every field must appear verbatim in your prompts.

DOCUMENTARY CANDID FEEL:
Every image must feel like a camera happened to be there and caught the real moment — not a posed portrait.
- People (if any): moving through, scanning the horizon, gesturing, crouching — never posing
- Environmental motion cues: dust rising, fabric shifting in wind, smoke drifting
- Slightly off-angle, low or high vantage, as if the camera crew followed them in

NATURAL EYES RULE:
- Eyes: natural, dark brown, with soft catchlights only
- FORBIDDEN: glowing eyes, lit-from-within, colored glowing pupils
- Face lighting: naturalistic, directional, or rim light only

ANTHROPOLOGICAL & HISTORICAL ACCURACY:
- NEVER base any figure on film, TV, or cinematic adaptations
- Ethnic features must match the actual historical population of the region and era
- Clothing must reflect actual archaeological and iconographic evidence

END EVERY PROMPT WITH:
"anthropologically accurate, based on period manuscripts and historical paintings, not film or television adaptations, documentary realism."

RESPONSE FORMAT (JSON only, no markdown):
{
  "analysis": {
    "complexity": "low|medium|high|extreme",
    "difficultyScore": 1-10,
    "hasCrowd": boolean,
    "hasArchitecture": boolean,
    "hasTransformation": true,
    "hasHistoricalFigure": boolean,
    "recommendedStyle": "cinematic|illustrated|minimalist",
    "productionNotes": ["note1", ...]
  },
  "prompts": [
    {
      "stageNumber": 1,
      "stageLabel": "Stage label from input",
      "timeProgress": 0,
      "shotType": "Wide Shot - Stage 1",
      "summary": "Turkish scene note (copy verbatim from input)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle, 'Bu görsel...' ile başla)",
      "prompt": "120-150 words, all entity fields embedded verbatim, static frozen moment at this stage"
    }
  ],
  "optimizations": ["optimization applied", ...]
}`;

/**
 * Generates a timelapse sequence of N independent prompts, one per stage.
 * Each prompt depicts a static frozen moment at a specific point in the time progression.
 * Stage count and labels come from sceneAnalysis.suggestedPromptCount and timelapseStages.
 */
export async function generateTimelapseSequence(
  scene: SceneCard,
  characters: Character[],
  locations: Location[],
  masterPrompt: string,
  sceneAnalysis: SceneAnalysis,
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '16:9',
  timeContexts?: TimeContext[],
  episodePrompt?: string,
  references?: SceneReference[],
  generationType: 'initial' | 'regenerate' = 'initial',
  onRetry?: () => void
): Promise<GenerationResult> {
  // Minimum 2 stages: a single-stage "timelapse" is meaningless and would produce an
  // invalid array when computing timeProgress (division by stageCount-1 would be 0).
  const stageCount = Math.max(2, sceneAnalysis.suggestedPromptCount);
  const timelapseStages: TimelapseStageInfo[] = sceneAnalysis.timelapseStages && sceneAnalysis.timelapseStages.length > 0
    ? sceneAnalysis.timelapseStages
    : Array.from({ length: stageCount }, (_, i) => ({
        stageNumber: i + 1,
        stageLabel: `Stage ${i + 1}`,
        timeProgress: Math.round((i / Math.max(stageCount - 1, 1)) * 100),
      }));

  // Build entity header (same as generatePromptsForScene)
  function sanitizeLighting(raw: string): string {
    return raw
      .replace(/\bblinding\b/gi, 'intense')
      .replace(/\bblinding white[- ]gold\b/gi, 'warm gold')
      .replace(/\bblinding white\b/gi, 'bright')
      .replace(/\bsupernatural stillness\b/gi, 'ethereal stillness')
      .replace(/\bsupernatural\b/gi, 'otherworldly')
      .replace(/\bethereal white[- ]gold\b/gi, 'soft gold')
      .replace(/\bcosmically bright\b/gi, 'softly luminous')
      .replace(/\bcosmically\b/gi, 'distantly')
      .replace(/\bwhite[- ]gold cosmic\b/gi, 'warm amber')
      .replace(/\bfrozen light\b/gi, 'still, quiet light')
      .replace(/\bglowing eyes\b/gi, 'natural eyes with soft catchlights')
      .replace(/\beyes.*?glow\b/gi, 'natural eyes with realistic reflections')
      .replace(/\bmystical glow\b/gi, 'soft ambient light')
      .replace(/\bspiritual light\b/gi, 'faint radiance')
      .replace(/\bhale\b/gi, 'subtle rim light')
      .replace(/\baura\b/gi, 'gentle illumination')
      .replace(/\bcosmic\b/gi, 'celestial');
  }

  let entityHeader = '';

  if (timeContexts && timeContexts.length > 0) {
    let timeHeader = `=== SCENE SETTING (CRITICAL — DO NOT IGNORE) ===\n`;
    timeContexts.forEach(tc => {
      timeHeader += `Time/Era: ${tc.label}${tc.era ? ` (${tc.era})` : ''}\n`;
      if (tc.timeOfDay) timeHeader += `Time of day: ${tc.timeOfDay} — THIS IS THE MANDATORY LIGHTING CONDITION\n`;
      if (tc.lighting) timeHeader += `Lighting: ${sanitizeLighting(tc.lighting)}\n`;
      if (tc.historicalNotes) timeHeader += `Historical context: ${tc.historicalNotes}\n`;
    });
    timeHeader += `⚠️ THE SCENE MUST BE SET IN THIS TIME AND LOCATION. DO NOT CHANGE TO DAY / SUNSET / FOREST / ROCKS.\n\n`;
    entityHeader = timeHeader + entityHeader;
  }

  if (characters.length > 0) {
    const individualChars = characters.filter(c => !c.isCrowd);
    if (individualChars.length === 1) {
      const char = individualChars[0];
      entityHeader += `=== CHARACTER TO DEPICT: ${char.name}${char.role ? ` (${char.role})` : ''} ===\n`;
      entityHeader += `⚠️ EMBED ALL OF THE FOLLOWING FIELDS VERBATIM INTO EVERY PROMPT. DO NOT OMIT OR SUMMARIZE ANY FIELD.\n`;
      if (char.age) entityHeader += `Age: ${char.age}\n`;
      if (char.ethnicity) entityHeader += `Phenotype/Ethnicity: ${char.ethnicity}\n`;
      if (char.physicalFeatures) entityHeader += `Facial features: ${char.physicalFeatures}\n`;
      if (char.hair) entityHeader += `Hair (color, length, style — describe exactly): ${char.hair}\n`;
      if (char.beard) entityHeader += `Beard/Facial hair (describe exactly): ${char.beard}\n`;
      if (char.clothing) entityHeader += `Costume (every garment and accessory — describe each): ${char.clothing}\n`;
      if (char.visualDescription) entityHeader += `Full visual description (integrate sentence by sentence): ${char.visualDescription}\n`;
      entityHeader += `⚠️ MAINTAIN THIS EXACT APPEARANCE ACROSS ALL ${stageCount} STAGE PROMPTS. ANY DEVIATION IS AN ERROR.\n\n`;
    } else if (individualChars.length > 1) {
      entityHeader += `=== MULTIPLE CHARACTERS IN THIS SCENE ===\n`;
      entityHeader += `Compose ALL characters in the SAME frame. Embed ALL fields of EACH character verbatim.\n\n`;
      individualChars.forEach((char, idx) => {
        const position = idx === 0 ? 'FOREGROUND' : idx === 1 ? 'MIDGROUND' : 'BACKGROUND';
        entityHeader += `[${position}] ${char.name}${char.role ? ` (${char.role})` : ''}:\n`;
        if (char.age) entityHeader += `  Age: ${char.age}\n`;
        if (char.ethnicity) entityHeader += `  Phenotype/Ethnicity: ${char.ethnicity}\n`;
        if (char.physicalFeatures) entityHeader += `  Facial features: ${char.physicalFeatures}\n`;
        if (char.hair) entityHeader += `  Hair: ${char.hair}\n`;
        if (char.beard) entityHeader += `  Beard/Facial hair: ${char.beard}\n`;
        if (char.clothing) entityHeader += `  Costume: ${char.clothing}\n`;
        if (char.visualDescription) entityHeader += `  Full description: ${char.visualDescription}\n`;
        entityHeader += `  ⚠️ MAINTAIN EXACT APPEARANCE.\n\n`;
      });
    }
    const crowds = characters.filter(c => c.isCrowd);
    if (crowds.length > 0) {
      entityHeader += '=== CROWD IN THIS SCENE ===\n';
      crowds.forEach(char => {
        entityHeader += `[CROWD] ${char.name}${char.role ? ` — ${char.role}` : ''}\n`;
        if (char.visualDescription) entityHeader += `Group appearance: ${char.visualDescription}\n`;
        entityHeader += '\n';
      });
    }
  }

  if (locations.length > 0) {
    if (locations.length === 1) {
      const loc = locations[0];
      entityHeader += `=== LOCATION TO DEPICT: ${loc.name} ===\n`;
      entityHeader += `⚠️ EMBED THIS LOCATION DESCRIPTION VERBATIM IN EVERY STAGE PROMPT. CAMERA POSITION MUST REMAIN IDENTICAL.\n`;
      if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
      entityHeader += `⚠️ THIS EXACT TERRAIN AND LANDSCAPE MUST APPEAR. NO SUBSTITUTION. SAME VANTAGE POINT EVERY STAGE.\n\n`;
    } else {
      entityHeader += `=== MULTIPLE LOCATIONS IN THIS SCENE ===\n`;
      locations.forEach((loc, idx) => {
        const pos = idx === 0 ? 'PRIMARY' : 'SECONDARY';
        entityHeader += `[${pos} LOCATION] ${loc.name}:\n`;
        if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
        entityHeader += '\n';
      });
    }
  }

  // Build the timelapse stages list for the prompt
  const stagesDescription = timelapseStages.map(s =>
    `  Stage ${s.stageNumber} (${s.stageLabel}, ${s.timeProgress}% through): ${s.description || s.stageLabel}`
  ).join('\n');

  const subjectRefs = references?.filter(r => r.referenceType === 'subject') || [];
  const styleRefs = references?.filter(r => r.referenceType === 'style') || [];

  const effectivePrompt = episodePrompt
    ? `${masterPrompt}\n\nEPISODE STYLE OVERRIDE (apply on top of master rules above):\n${episodePrompt}`
    : masterPrompt;

  let userMessage = entityHeader;
  userMessage += `SAHNE METNİ:\n${scene.text}\n\n`;
  userMessage += `TÜRKÇE GÖRSEL NOT: "${scene.visualNote}"\n\n`;

  const styleNote = scene.visualStyle === 'symbolic'
    ? `\nVISUAL STYLE: Symbolic/metaphorical scene — painterly, ethereal aesthetics.\n`
    : `\nVISUAL STYLE: Photorealistic, cinematic documentary style.\n`;
  userMessage += styleNote;

  userMessage += `\n🎬 TIMELAPSE SEQUENCE — ${stageCount} STAGES\n`;
  userMessage += `Generate EXACTLY ${stageCount} prompts, one per stage below:\n`;
  userMessage += stagesDescription + '\n\n';
  userMessage += `CONSISTENCY RULE: Same camera angle, same location, same characters across ALL stages.\n`;
  userMessage += `CHANGE RULE: ONLY the time-progression element (the natural phenomenon/construction/process) changes.\n\n`;

  if (subjectRefs.length > 0) {
    userMessage += `\nSUBJECT REFERENCES:\n${subjectRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n`;
  }
  if (styleRefs.length > 0) {
    userMessage += `\nSTYLE REFERENCES:\n${styleRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n`;
  }

  if (effectivePrompt) {
    userMessage += `MASTER PROMPT (apply to all stage prompts):\n${effectivePrompt}\n\n`;
  }

  userMessage += `🎬 ASPECT RATIO: ${aspectRatio} (${aspectRatioGuide[aspectRatio] ?? aspectRatioGuide['16:9']})\n`;
  userMessage += `COMPOSITION HINT: ${compositionHints[aspectRatio] ?? compositionHints['16:9']}\n\n`;
  userMessage += `${stageCount} aşama için statik, dondurulmuş sahne promptları üret. Her prompt'ta "${scene.visualNote}" notunun ruhunu koru. Her prompt sonuna "--ar ${aspectRatio} --v 6" ekle.`;

  function tryParseJSON(raw: string) {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  const content = await aiProvider.generateContent(userMessage, TIMELAPSE_GENERATION_SYSTEM_PROMPT, {
    operationType: 'timelapse_generation'
  });

  let parsed: {
    prompts?: Array<{
      stageNumber?: number;
      stageLabel?: string;
      timeProgress?: number;
      shotType?: string;
      summary?: string;
      explanation?: string;
      prompt?: string;
    }>;
    analysis?: Partial<PromptAnalysis>;
    optimizations?: string[];
  };

  try {
    parsed = tryParseJSON(content);
  } catch (firstErr) {
    console.error('[⚠️ promptGenerator/timelapse] JSON parse failed on first attempt, retrying...', firstErr);
    console.error('Malformed response:', content);
    onRetry?.();
    const retryMessage = userMessage + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.';
    const retryContent = await aiProvider.generateContent(retryMessage, TIMELAPSE_GENERATION_SYSTEM_PROMPT, { operationType: 'timelapse_generation_retry' });
    try {
      parsed = tryParseJSON(retryContent);
    } catch (secondErr) {
      console.error('[❌ promptGenerator/timelapse] JSON parse failed after retry. Giving up.', secondErr);
      throw new Error('Invalid JSON in timelapse prompt response (after retry)');
    }
  }

  if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
    throw new Error('Invalid timelapse prompt response format');
  }

  const arSuffix = `--ar ${aspectRatio} --v 6`;

  const prompts: PromptCard[] = parsed.prompts.map((p, idx: number) => {
    // Match stage info — prefer AI-returned stageNumber, fallback to index order
    const stageIdx = typeof p.stageNumber === 'number' ? p.stageNumber - 1 : idx;
    const stageInfo = timelapseStages[stageIdx] ?? timelapseStages[idx] ?? {
      stageNumber: idx + 1,
      stageLabel: `Stage ${idx + 1}`,
      timeProgress: Math.round((idx / Math.max(stageCount - 1, 1)) * 100),
    };

    const rawPrompt = p.prompt || '';
    const promptText = /--ar\s+[\d:]+/.test(rawPrompt) ? rawPrompt : `${rawPrompt} ${arSuffix}`.trim();

    return {
      id: crypto.randomUUID(),
      type: 'wide' as const, // timelapse stages are always wide/establishing shots
      label: `Aşama ${stageInfo.stageNumber}: ${stageInfo.stageLabel}`,
      shotType: p.shotType || `Stage ${stageInfo.stageNumber} — ${stageInfo.stageLabel}`,
      summary: p.summary || scene.visualNote,
      explanation: p.explanation || '',
      promptText,
      versions: [promptText],
      aspectRatio,
      generationType,
      hasSubjectReference: subjectRefs.length > 0,
      isTimelapseStage: true,
      timelapseStageNumber: stageInfo.stageNumber,
      stageLabel: stageInfo.stageLabel,
      timeProgress: stageInfo.timeProgress,
    };
  });

  const rawAnalysis = parsed.analysis ?? {};
  const analysis: PromptAnalysis = {
    complexity: (rawAnalysis.complexity as PromptAnalysis['complexity']) ?? DEFAULT_ANALYSIS.complexity,
    difficultyScore: typeof rawAnalysis.difficultyScore === 'number' ? rawAnalysis.difficultyScore : DEFAULT_ANALYSIS.difficultyScore,
    hasCrowd: typeof rawAnalysis.hasCrowd === 'boolean' ? rawAnalysis.hasCrowd : DEFAULT_ANALYSIS.hasCrowd,
    hasArchitecture: typeof rawAnalysis.hasArchitecture === 'boolean' ? rawAnalysis.hasArchitecture : DEFAULT_ANALYSIS.hasArchitecture,
    hasTransformation: true,
    hasHistoricalFigure: typeof rawAnalysis.hasHistoricalFigure === 'boolean' ? rawAnalysis.hasHistoricalFigure : DEFAULT_ANALYSIS.hasHistoricalFigure,
    recommendedStyle: typeof rawAnalysis.recommendedStyle === 'string' ? rawAnalysis.recommendedStyle : DEFAULT_ANALYSIS.recommendedStyle,
    productionNotes: Array.isArray(rawAnalysis.productionNotes) ? rawAnalysis.productionNotes : DEFAULT_ANALYSIS.productionNotes,
  };

  const optimizations: string[] = Array.isArray(parsed.optimizations) ? parsed.optimizations : [];

  return { prompts, analysis, optimizations };
}

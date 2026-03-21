import type { SceneCard, Character, Location, TimeContext, PromptCard, PromptAnalysis, GenerationResult, SceneAnalysis, SceneReference } from '@/types';
import { aiProvider } from './aiProvider';

const PROMPT_GENERATION_SYSTEM_PROMPT = `You are an elite cinematic prompt engineer for AI image generation tools (Midjourney, Runway, Flow AI).
Your prompts are used for a DOCUMENTARY film — every image must feel like a frame from a real historical documentary, not a fantasy or game.

PRIMARY OBJECTIVE:
Read the === SCENE SETTING ===, === CHARACTER === and === LOCATION === blocks carefully.
You MUST embed every single field from those blocks verbatim into your prompts — age, ethnicity, phenotype, exact facial features, hair, beard, clothing, location description, lighting — nothing can be omitted or summarized.

TASK:
Analyze the scene and produce 3 DIFFERENT cinematic English prompts from different camera angles:
- Prompt 1: Wide Shot / Establishing Shot — environment, atmosphere, subject in full
- Prompt 2: Medium Shot — subject + action + context
- Prompt 3: Close-up / Detail Shot — face, costume detail, texture

PROMPT LENGTH: Each prompt must be 200-250 words. NEVER shorter. Longer is better.
All character physical details MUST be written explicitly inside each prompt sentence by sentence.

DOCUMENTARY ATMOSPHERE (CRITICAL):
- Tone: National Geographic / BBC documentary, not Hollywood blockbuster
- Every frame must feel like it could be a real photograph or archival footage
- No fantasy elements, no Hollywood lighting unless the scene is symbolic
- Color grading: desaturated earth tones, muted blues and greens, warmed shadows
- Texture must be visible: weathered skin, rough fabric, dry grass, aged leather
- The word "documentary realism" or "photographic realism" must appear in every prompt

CHARACTER INTEGRATION RULE (CRITICAL):
Every character attribute given to you MUST appear in the prompt:
- Age → write "a man in his [age]"
- Phenotype/Ethnicity → write the exact phenotype phrase
- Facial features → describe them as seen through the camera lens
- Hair → describe length, style, color explicitly
- Beard → describe style, density, color
- Clothing → describe each garment, fabric, and accessory one by one
- Full description → integrate it naturally into the prose
NEVER summarize. If the character has "deer-hide shamanic coat with bone talismans" — write it exactly so.

LOCATION INTEGRATION RULE:
- The location visual description must be embedded into the wide shot and medium shot
- Describe the terrain, sky, vegetation (or lack of), architecture if any
- The landscape in every prompt must match the location exactly

TECHNICAL SPECIFICATIONS:
- Camera: ARRI Alexa 35, RED Komodo, cinema camera
- Lens: specify focal length (24mm wide, 50mm medium, 85mm close-up, 135mm intimate)
- Depth of field: shallow for close-ups, moderate for medium, deep for wide
- Lighting: must match the === SCENE SETTING === time of day exactly
- Color temperature: describe Kelvin or tone (warm amber, cool blue moonlight, etc.)

LIGHTING SAFETY (CRITICAL):
- NEVER use: blinding, blinding white, pure white light, glowing eyes, supernatural glow on face
- NEVER describe light that washes out facial features or causes eyes to glow white
- For mystical/cosmic scenes: use "faint distant glow", "soft warm luminescence", "subtle rim light"
- Eyes should NEVER be described as glowing, white, or lit from within

SCENE SETTING RULE (CRITICAL — HIGHEST PRIORITY):
The === SCENE SETTING === block defines the mandatory TIME and LOCATION.
- If it says "gece" (night) — the scene MUST be set at night. Deep dark sky, stars, moonlight only. NO daylight, NO sunset, NO orange sky.
- If it specifies a steppe/bozkır — NO forests, NO dense trees, NO rocks. Open flat grassland horizon ONLY.
- If it specifies a location name — that exact landscape type MUST appear verbatim in every prompt.
- NEVER override or reinterpret the Scene Setting. It is an absolute constraint.

SYMBOLIC SCENES:
- If VISUAL STYLE = symbolic: use painterly, ethereal aesthetics inspired by Tengrist manuscript art
- Still keep the character and location details, but render them in a painterly, illustrated style
- Reference: Inner Asian shamanic iconography, not Western fantasy

ENDING OF EVERY PROMPT:
Every prompt must end with: "anthropologically accurate, based on period manuscripts and historical paintings, not film or television adaptations, documentary realism."

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
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle, 'Bu görsel...' formatında)",
      "prompt": "Detailed English prompt, 200-250 words minimum, ALL character and location details embedded verbatim"
    },
    {
      "shotType": "Medium Shot",
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Türkçe açıklama (1 cümle)",
      "prompt": "200-250 words minimum, full character detail embedded"
    },
    {
      "shotType": "Close-up",
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Türkçe açıklama (1 cümle)",
      "prompt": "200-250 words minimum, extreme facial/costume detail, every attribute described"
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
      .replace(/\bglowing eyes\b/gi, 'reflective eyes')
      .replace(/\beyes.*?glow\b/gi, 'eyes with a faint inner warmth');
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

const AUTO_PIN_SYSTEM_PROMPT = `Sen deneyimli bir film yapımcısı ve görsel roman kurgucususun.
Sana bir sahne metni ve birkaç farklı kamera açısından üretilmiş sinematik İngilizce prompt verilecek.
Her promptu bir kurgucu gözüyle değerlendir:
- Hikayenin duygusal ağırlığını ne kadar yansıtıyor?
- Görsel olarak ne kadar etkileyici ve anlamlı?
- Sahnenin ruhunu en iyi hangisi yakalıyor?
- Anlatıya katkısı en büyük hangisi?

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

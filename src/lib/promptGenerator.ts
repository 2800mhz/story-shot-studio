import type { SceneCard, Character, Location, TimeContext, PromptCard, PromptAnalysis, GenerationResult, SceneAnalysis } from '@/types';
import { aiProvider } from './aiProvider';

const PROMPT_GENERATION_SYSTEM_PROMPT = `Sen sinematik görsel prompt üreticisisin. AI görsel üretim araçları için (Midjourney, DALL-E, Runway) detaylı prompt'lar yazıyorsun.

GÖREV: Verilen sahne bilgilerini analiz et, zorluk derecesini belirle ve 3 FARKLI açıdan sinematik İngilizce prompt üret.

KURALLAR:
1. Her prompt FARKLI bir kamera açısı olmalı:
   - Prompt 1: Wide Shot / Establishing Shot
   - Prompt 2: Medium Shot / Action Shot
   - Prompt 3: Close-up / Detail Shot
2. Her prompt 80-120 kelime olmalı
3. Teknik detaylar ekle: kamera, lens, ışık, kompozisyon
4. Karakter/mekan açıklamalarını doğal şekilde entegre et
5. Türkçe notun ruhunu koru ama prompt İngilizce olmalı

TEKNİK ÖZELLİKLER:
- Kamera: ARRI Alexa, RED Komodo, cinema camera
- Lens: focal length (24mm, 50mm, 85mm)
- Işık: soft/hard, direction, color temperature
- Renk paleti: cinematic color grading
- Kompozisyon: rule of thirds, depth of field

ANIMATION-FRIENDLY COMPOSITION:
- Maximum 3 subjects per frame
- Prefer static or slow single-direction movement
- Avoid: complex crowd scenes, flowing water/fabric, particle effects
- Use shallow depth of field to isolate subjects
- Simple geometric backgrounds preferred

HISTORICAL ACCURACY:
- Include specific era (century, dynasty, geographic region)
- Specify ethnic phenotype based on geographic region
- Reference architectural style specific to time period (Ottoman, Byzantine, Seljuk, etc.)
- Use period-accurate costume and material descriptions

TIMELAPSE / TEMPORAL SEQUENCES:
- If hasTransformation=true in scene analysis: show clear visual progression between the 3 prompts
  * Prompt 1 (Wide Shot): Beginning state — establish the scene before transformation
  * Prompt 2 (Medium Shot): Mid-transition state — capture the moment of change
  * Prompt 3 (Close-up): Final/transformed state — reveal the result
- Each prompt must be visually distinct but narratively connected
- Do NOT use motion verbs like "transforming", "changing", "morphing" — describe static moments

📊 ÖNCE ANALİZ YAP:
1. Sahne karmaşıklığı (minimal/low/medium/high/extreme)
2. Kalabalık var mı? (5+ kişi)
3. Transformasyon/time-lapse var mı?
4. Mimari detay var mı?
5. Tarihsel figür var mı?

⚡ OPTİMİZASYON KURALLARI:

🚫 KALABALIK SAHNELER (5+ kişi):
→ Wide/extreme wide shot kullan
→ "Silhouetted figures" veya "backlit crowd"
→ "Atmospheric haze" ekle
→ Örnek: "Wide shot of silhouetted crowd in courtyard, backlit by warm ambient glow"

🏛️ MİMARİ DETAY:
→ Mimari stil belirt (Ottoman, Byzantine, Modern)
→ "Atmospheric perspective" kullan
→ Örnek: "Ottoman mosque in atmospheric evening light"

🔄 TRANSFORMASYON/MORPH:
→ SPLIT into multiple static scenes
→ VEYA illustrated/schematic style kullan
→ AVOID: "transforming", "changing", "morphing"

👑 TARİHSEL FİGÜR:
→ "Illustrated style" veya "Ottoman miniature painting"
→ AVOID: photorealistic close-ups

📝 RESPONSE FORMAT (JSON):
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
      "summary": "Sahnenin Türkçe notu (aynen kopyala)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle, 'Bu görsel...' formatında)",
      "prompt": "Detailed English prompt, 80-120 words, technical specifications included"
    },
    {
      "shotType": "Medium Shot",
      "summary": "Sahnenin Türkçe notu (aynen kopyala)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle)",
      "prompt": "Different angle/composition, 80-120 words"
    },
    {
      "shotType": "Close-up",
      "summary": "Sahnenin Türkçe notu (aynen kopyala)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle)",
      "prompt": "Intimate detail shot, 80-120 words"
    }
  ],
  "optimizations": ["Applied optimization", ...]
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
  generationType: 'initial' | 'regenerate' = 'initial',
  onRetry?: () => void
): Promise<GenerationResult> {
  let userMessage = `SAHNE METNİ:\n${scene.text}\n\n`;
  userMessage += `TÜRKÇE GÖRSEL NOT: "${scene.visualNote}"\n\n`;

  // Build entity context string
  let entityContext = '';

  if (characters.length > 0) {
    entityContext += 'CHARACTERS IN THIS SCENE:\n';
    characters.forEach(char => {
      const prefix = char.isCrowd
        ? `- [CROWD] ${char.name}`
        : `- ${char.name}${char.role ? ` (${char.role})` : ''}`;
      const desc = char.visualDescription
        ? ` — ${char.visualDescription}`
        : '';
      entityContext += prefix + desc + '\n';
    });
    entityContext += '\n';
  }

  if (locations.length > 0) {
    entityContext += 'LOCATIONS IN THIS SCENE:\n';
    locations.forEach(loc => {
      const desc = loc.visualDescription ? ` — ${loc.visualDescription}` : '';
      entityContext += `- ${loc.name}${desc}\n`;
    });
    entityContext += '\n';
  }

  if (timeContexts && timeContexts.length > 0) {
    entityContext += 'HISTORICAL/TEMPORAL CONTEXT:\n';
    timeContexts.forEach(tc => {
      let tDesc = `- ${tc.label}`;
      if (tc.era) tDesc += ` (${tc.era})`;
      if (tc.season) tDesc += `, ${tc.season}`;
      if (tc.timeOfDay) tDesc += `, ${tc.timeOfDay}`;
      if (tc.lighting) tDesc += `, lighting: ${tc.lighting}`;
      if (tc.weather) tDesc += `, weather: ${tc.weather}`;
      if (tc.historicalNotes) tDesc += `. Historical notes: ${tc.historicalNotes}`;
      entityContext += tDesc + '\n';
    });
    entityContext += '\n';
  }

  if (entityContext) {
    userMessage += entityContext;
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

  const content = await aiProvider.generateContent(userMessage, PROMPT_GENERATION_SYSTEM_PROMPT);

  // Helper: try to parse the AI response as JSON, stripping any markdown fences first.
  function tryParseJSON(raw: string) {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

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
    const retryContent = await aiProvider.generateContent(retryMessage, PROMPT_GENERATION_SYSTEM_PROMPT);
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
      REVISION_SYSTEM_PROMPT
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

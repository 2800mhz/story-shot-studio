import type { SceneCard, Character, Location, PromptCard, PromptAnalysis, GenerationResult } from '@/types';

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

OPTİMİZASYON KURALLARI (Zorlu sahneler için):
- Kalabalık (5+ kişi): wide shot + silhouette staging + atmospheric haze kullan
- Transformasyon sahnesi: her aşama için ayrı statik kare veya illustrated style öner
- Mimari detay: atmospheric perspective + soft detail tercih et
- Tarihsel figür: illustrated/miniature style kullan, photorealistic'ten kaçın

JSON ÇIKTI FORMATI:
{
  "analysis": {
    "complexity": "low|medium|high|extreme",
    "difficultyScore": 1-10,
    "hasCrowd": boolean,
    "hasArchitecture": boolean,
    "hasTransformation": boolean,
    "hasHistoricalFigure": boolean,
    "recommendedStyle": "string",
    "productionNotes": ["string"]
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
  "optimizations": ["Applied optimization 1", "Applied optimization 2"]
}`;

const ASPECT_RATIO_HINTS: Record<string, string> = {
  '16:9': 'Landscape cinematic widescreen composition (16:9). Use horizontal space, rule of thirds, strong horizon lines.',
  '4:3': 'Classic 4:3 ratio composition. Balanced framing, centered subjects, traditional cinematic feel.',
  '1:1': 'Square 1:1 composition. Centered subject, symmetrical framing, social-media-friendly crop.',
  '9:16': 'Vertical portrait composition (9:16). Fill frame vertically, subject-forward, mobile-optimized framing.',
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
  characters: Character[]
): PromptAnalysis {
  const text = (sceneText + ' ' + visualNote).toLowerCase();

  const hasCrowd = characters.length >= 5 ||
    /kalabal[ıi]k|crowd|kitle|topluluk|ordu|asker|halk|izleyici/.test(text);

  const hasArchitecture = /saray|kale|cami|kilise|bina|köprü|kule|palace|castle|mosque|church|building|bridge|tower|architecture/.test(text);

  const hasTransformation = /dönüş|transform|değiş|büyü|sihir|magic|morph|change|evolv|metamorf/.test(text);

  const hasHistoricalFigure = /sultan|padişah|hükümdar|kral|kraliçe|imparator|vezir|paşa|king|queen|emperor|historical|tarihsel/.test(text);

  let difficultyScore = 1;
  if (hasCrowd) difficultyScore += 2;
  if (hasArchitecture) difficultyScore += 1;
  if (hasTransformation) difficultyScore += 3;
  if (hasHistoricalFigure) difficultyScore += 1;
  if (characters.length > 3) difficultyScore += 1;
  difficultyScore = Math.min(difficultyScore, 10);

  let complexity: PromptAnalysis['complexity'] = 'low';
  if (difficultyScore >= 9) complexity = 'extreme';
  else if (difficultyScore >= 7) complexity = 'high';
  else if (difficultyScore >= 5) complexity = 'medium';
  else if (difficultyScore >= 3) complexity = 'low';
  else complexity = 'minimal';

  let recommendedStyle = 'cinematic photorealistic';
  if (hasHistoricalFigure) recommendedStyle = 'illustrated miniature style';
  else if (hasTransformation) recommendedStyle = 'illustrated stylized sequence';
  else if (hasCrowd) recommendedStyle = 'wide cinematic with atmospheric haze';

  const productionNotes: string[] = [];
  if (hasCrowd) productionNotes.push('Use wide shot with silhouette staging and atmospheric haze for crowd scenes');
  if (hasTransformation) productionNotes.push('Split transformation into multiple static frames or use illustrated style');
  if (hasArchitecture) productionNotes.push('Apply atmospheric perspective and soft detail for architectural elements');
  if (hasHistoricalFigure) productionNotes.push('Avoid photorealistic style for historical figures; prefer illustrated or miniature style');

  return {
    complexity,
    difficultyScore,
    hasCrowd,
    hasArchitecture,
    hasTransformation,
    hasHistoricalFigure,
    recommendedStyle,
    productionNotes,
  };
}

export async function generatePromptsForScene(
  scene: SceneCard,
  characters: Character[],
  locations: Location[],
  masterPrompt: string,
  apiKey: string,
  model: string,
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '16:9'
): Promise<GenerationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let userMessage = `SAHNE METNİ:\n${scene.text}\n\n`;
  userMessage += `TÜRKÇE GÖRSEL NOT: "${scene.visualNote}"\n\n`;

  if (characters.length > 0) {
    userMessage += `KARAKTERLER:\n`;
    characters.forEach(char => {
      userMessage += `- ${char.name}: ${char.description}\n`;
    });
    userMessage += '\n';
  }

  if (locations.length > 0) {
    userMessage += `MEKANLAR:\n`;
    locations.forEach(loc => {
      userMessage += `- ${loc.name}: ${loc.description}\n`;
    });
    userMessage += '\n';
  }

  if (masterPrompt) {
    userMessage += `MASTER PROMPT (tüm prompt'larda dikkate al):\n${masterPrompt}\n\n`;
  }

  const compositionHint = ASPECT_RATIO_HINTS[aspectRatio] ?? ASPECT_RATIO_HINTS['16:9'];
  userMessage += `ASPECT RATIO: ${aspectRatio}\nKOMPOZİSYON İPUCU: ${compositionHint}\n\n`;

  userMessage += `3 farklı açıdan sinematik prompt üret. Her prompt'ta "${scene.visualNote}" notunun ruhunu koru. Her prompt sonuna "--ar ${aspectRatio} --v 6" ekle.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: PROMPT_GENERATION_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 4096,
        response_mime_type: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Prompt generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let parsed: {
    prompts?: Array<{ shotType?: string; summary?: string; explanation?: string; prompt?: string }>;
    analysis?: Partial<PromptAnalysis>;
    optimizations?: string[];
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON in prompt response');
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
      id: `prompt-${scene.id}-${idx}`,
      type: types[idx] ?? 'wide',
      label: labels[idx] ?? `Prompt ${idx + 1}`,
      shotType: p.shotType || 'General',
      summary: p.summary || scene.visualNote,
      explanation: p.explanation || '',
      promptText,
      versions: [promptText],
      aspectRatio,
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

import type { SceneCard, Character, Location, TimeContext, PromptCard, PromptAnalysis, GenerationResult, SceneAnalysis, SceneReference } from '@/types';
import { aiProvider } from './aiProvider';

const PROMPT_GENERATION_SYSTEM_PROMPT = `You are an elite cinematic prompt engineer for AI image generation tools (Midjourney, Runway, Flow AI).
Your prompts are used for documentary and historical films. Every image must feel like a frame from a real photograph or archival footage — not a fantasy, game, or Hollywood production.

TASK:
Analyze the scene and produce 3 DIFFERENT cinematic English prompts from different camera angles:
- Prompt 1: Wide Shot / Establishing Shot — environment, atmosphere, full context
- Prompt 2: Medium Shot — subject + action + immediate surroundings  
- Prompt 3: Close-up / Detail Shot — costume texture, hands, silhouette edge, environmental object — NEVER a frontal face

PROMPT LENGTH: 120-150 words each. Precise and specific.

═══════════════════════════════════════════════════════════
FACE & POSE PROHIBITION — ABSOLUTE RULE — NO EXCEPTIONS
═══════════════════════════════════════════════════════════
NEVER produce a frontal face portrait in ANY of the 3 prompts.
This applies even when a CHARACTER entity is provided.
FORBIDDEN in EVERY prompt, always:
  ✗ Direct frontal face / portrait / face staring at camera
  ✗ Subjects posing for the camera or making eye contact with lens
  ✗ "Focusing on the face of [character]" phrasing
  ✗ Close-up of face / head-and-shoulders portrait
  ✗ Direct eye contact, piercing gaze toward viewer

REQUIRED camera angles that hide or redirect the face:
  ✓ Back view — subject walking away, facing away from camera
  ✓ Profile / side view — 90° angle, face partially or fully in shadow
  ✓ Over-the-shoulder — camera behind subject, looking at what they see
  ✓ Low angle from ground — looking up at torso and sky, face tilted away
  ✓ Obscured by environment — face in shadow, dust, smoke, backlit silhouette
  ✓ Distant figure — too far for facial detail
  ✓ Hands / clothing detail close-up instead of face
  ✓ Deep silhouette against bright sky or fire

FOR CLOSE-UP (Prompt 3) — when a CHARACTER entity exists:
  Choose ONE of: hands gripping object, fabric folds, boot in dust, silhouette edge,
  headdress detail from behind, belt/weapon detail, shadow cast on ground.
  NEVER choose: face, eyes, expression.

FOR MEDIUM SHOT (Prompt 2):
  Subject must be in motion or action — turning, walking, lifting, kneeling.
  Camera angle: over-the-shoulder, 3/4 back, or low angle.
  Subject's face must be angled away, in shadow, or obscured by motion.

CAMERA FRAMING LANGUAGE TO USE (pick from these):
  "back turned to camera", "seen from behind", "over-the-shoulder framing",
  "face in deep shadow", "silhouetted against the sky", "profile view, face in shadow",
  "low angle, face tilted upward and away from lens", "distant figure, face indistinguishable",
  "face obscured by dust and motion blur", "camera behind the subject"
═══════════════════════════════════════════════════════════

ENTITY INTEGRATION (CRITICAL):
The === SCENE SETTING ===, === CHARACTER ===, and === LOCATION === blocks are your ONLY source of truth.
Do NOT invent, assume, or add anything not stated in these blocks.
Every field must appear verbatim in your prompts:
- Age, phenotype, hair, beard, clothing → write each explicitly
- Location terrain, sky, architecture, vegetation → describe exactly as given
- Time of day, lighting, weather → must match SCENE SETTING exactly
NEVER summarize. If the character has "deer-hide coat with bone talismans" — write it exactly so.
NOTE: Embed physical character details (silhouette, clothing, posture) — but ALWAYS pair with the face-hiding camera angle rules above.

CHARACTER RECURRENCE (CRITICAL):
Every prompt (Wide, Medium, Close-up) must repeat ALL character physical attributes.
Do NOT assume the AI model remembers from Prompt 1.
Clothing, silhouette, posture, every garment — repeat in all 3 prompts.
(Do NOT repeat "facial features" as a face directive — redirect to indirect angle instead.)

NO ENTITY = NO FACES AT ALL (CRITICAL):
If NO === CHARACTER === block is provided, you MUST NOT show ANY human faces in ANY prompt (Wide, Medium, or Close-up).
Instead, use INDIRECT storytelling: show silhouettes in dust, distant figures without detail, trampled objects, architecture, shadows, or environmental damage.
FORBIDDEN: inventing a random unnamed person (civilian, soldier) and showing their face just to fill the frame.
Prompt 3 MUST ALWAYS be an architectural or environmental detail (cracked stone, rust, dust, dropped object) if there's no character entity.

CINEMATIC & INDIRECT STORYTELLING (CRITICAL — APPLIES TO ALL PROMPTS):
Every image must feel like a gritty, high-end cinematic documentary catching a real moment organically.
FORBIDDEN in every prompt:
- Plain, generic human faces staring blankly (e.g. standard Mongol soldier face, standard ruined civilian face).
- Direct portraits of historical figures (Sultans, commanders). Always use indirect angles.
- People posing for the camera or looking directly into the lens.
- "Theater-stage" unrealistic compositions (e.g. two armies perfectly arranged facing each other just to fit the frame, breaking reality).
- Symmetrical "hero pose" arrangements or flat studio-lighting.
REQUIRED:
- Use INDIRECT angles: over-the-shoulder, back view, deep silhouettes, obscured faces in shadow/smoke, extreme low/high angles.
- Describe where subjects are looking or moving: turning away, rushing past the camera, face obscured by dust/armor.
- For battles/crowds/cities: use asymmetrical framing, chaotic fragments of action (a horse's hooves, a raised banner in smoke, trampled belongings), not the whole army neatly arranged in frame.
- Add environmental motion cues: dust rising, fabric shifting in wind, smoke drifting.
- "Candid documentary frame", "caught-in-motion", "cinematic indirect framing" are valid descriptors.

MULTI-GROUP COMPOSITIONS (battles, two sides, crowd vs civilians):
NEVER fit two opposing groups facing each other in the same frame — this creates a theater-stage illusion that breaks visual reality.
Instead choose ONE of:
  - Bird's-eye / aerial extreme wide: both groups seen from far above, geography matters
  - Chaotic fragment: one side's boots, weapons, dust — the other implied by sound/shadow
  - Single perspective: camera inside one group looking outward (not at the other group)

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
(Note: since faces should not be prominent per the face prohibition above, this mainly applies to profile/shadow scenarios.)

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
      "prompt": "120-150 words, all entity fields embedded verbatim, face-hiding camera angle mandatory"
    },
    {
      "shotType": "Medium Shot",
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Türkçe açıklama (1 cümle)",
      "prompt": "120-150 words, full character and location detail, over-the-shoulder or back view mandatory"
    },
    {
      "shotType": "Close-up",
      "summary": "Turkish scene note (copy verbatim)",
      "explanation": "Türkçe açıklama (1 cümle)",
      "prompt": "120-150 words, hands/clothing/object/silhouette detail ONLY — NO face close-up even if CHARACTER entity exists"
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

  // ─── ENTITY HEADER ───────────────────────────────────────────────────────────
  let entityHeader = '';

  if (characters.length > 0) {
    const individualChars = characters.filter(c => !c.isCrowd);

    // Mandatory camera-angle enforcement injected per character block
    const FACE_RULE = `⚠️ CAMERA RULE: Subject's face must NOT be visible frontally in any prompt.
Use one of: back view, over-the-shoulder, profile in shadow, silhouette, face obscured by dust/smoke.
Embed clothing and silhouette details verbatim — redirect "facial features" into indirect angle description.\n`;

    if (individualChars.length === 1) {
      const char = individualChars[0];
      entityHeader += `=== CHARACTER TO DEPICT: ${char.name}${char.role ? ` (${char.role})` : ''} ===\n`;
      entityHeader += `⚠️ EMBED ALL OF THE FOLLOWING FIELDS VERBATIM INTO EVERY PROMPT. DO NOT OMIT OR SUMMARIZE ANY FIELD.\n`;
      entityHeader += FACE_RULE;
      if (char.age) entityHeader += `Age/build silhouette: ${char.age}\n`;
      if (char.ethnicity) entityHeader += `Phenotype/Ethnicity (for costume and posture context): ${char.ethnicity}\n`;
      if (char.physicalFeatures) entityHeader += `Physical build and silhouette (NOT for frontal rendering — use for posture/back-view detail): ${char.physicalFeatures}\n`;
      if (char.hair) entityHeader += `Hair visible from back/profile (color, length, style): ${char.hair}\n`;
      if (char.beard) entityHeader += `Beard visible in profile/shadow: ${char.beard}\n`;
      if (char.clothing) entityHeader += `Costume (every garment and accessory — describe each, visible from back or side): ${char.clothing}\n`;
      if (char.visualDescription) entityHeader += `Full visual description (integrate into back-view or silhouette framing): ${char.visualDescription}\n`;
      entityHeader += `⚠️ MAINTAIN THIS EXACT APPEARANCE ACROSS ALL 3 PROMPTS. FACE MUST NOT BE FRONTALLY VISIBLE IN ANY PROMPT.\n\n`;

    } else if (individualChars.length > 1) {
      entityHeader += `=== MULTIPLE CHARACTERS IN THIS SCENE ===\n`;
      entityHeader += `Compose ALL characters in the SAME frame. Embed ALL fields of EACH character verbatim.\n`;
      entityHeader += FACE_RULE;
      individualChars.forEach((char, idx) => {
        const position = idx === 0 ? 'FOREGROUND' : idx === 1 ? 'MIDGROUND' : 'BACKGROUND';
        entityHeader += `[${position}] ${char.name}${char.role ? ` (${char.role})` : ''}:\n`;
        if (char.age) entityHeader += `  Age/build: ${char.age}\n`;
        if (char.ethnicity) entityHeader += `  Phenotype/Ethnicity (costume context): ${char.ethnicity}\n`;
        if (char.physicalFeatures) entityHeader += `  Silhouette/build (back or profile only): ${char.physicalFeatures}\n`;
        if (char.hair) entityHeader += `  Hair from back/profile: ${char.hair}\n`;
        if (char.beard) entityHeader += `  Beard in profile/shadow: ${char.beard}\n`;
        if (char.clothing) entityHeader += `  Costume: ${char.clothing}\n`;
        if (char.visualDescription) entityHeader += `  Full description (back/profile framing): ${char.visualDescription}\n`;
        entityHeader += `  ⚠️ NO FRONTAL FACE. Back view or profile in shadow.\n\n`;
      });
    }

    const crowds = characters.filter(c => c.isCrowd);
    if (crowds.length > 0) {
      entityHeader += '=== CROWD IN THIS SCENE ===\n';
      entityHeader += '⚠️ Crowd: use backlit silhouettes, seen from behind or bird\'s-eye. No individual faces.\n';
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

  // Agresif ışık ifadelerini yumuşat
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

  // ZAMAN BAĞLAMI — entityHeader'ın EN BAŞINA eklenir
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

  userMessage = entityHeader + userMessage;

  // Inject References
  const subjectRefs = references?.filter(r => r.referenceType === 'subject') || [];
  const styleRefs = references?.filter(r => r.referenceType === 'style') || [];

  if (subjectRefs.length > 0) {
    userMessage += `\nSUBJECT REFERENCES:\n${subjectRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n`;
  }
  if (styleRefs.length > 0) {
    userMessage += `\nSTYLE REFERENCES:\n${styleRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n`;
  }

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
  userMessage += `\n\n⚠️ REMINDER: No frontal faces in any of the 3 prompts. Back view / over-the-shoulder / silhouette mandatory for all character appearances.`;

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
5. If the user asks to remove something, remove it naturally without breaking the sentence structure.
6. NEVER introduce a frontal face or direct portrait angle during revision — maintain indirect framing.`;

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
  el, detay, doku, nesne, silüet kenarı — yüz değil

CLOSE-UP'I ASLA seçme eğer:
- Sahnede 3+ kişi/asker varsa
- Sahne bir mekan/şehir/doğa anlatıyorsa
- Görsel notta "ordu", "kalabalık", "sur", "şehir" gibi kelimeler varsa

VARSAYILAN: Eğer emin değilsen MEDIUM SHOT seç, CLOSE-UP değil.

SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{ "selectedIndex": 0, "reason": "Türkçe kısa gerekçe (max 1 cümle)" }
selectedIndex: 0 = ilk prompt, 1 = ikinci prompt, 2 = üçüncü prompt`;

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
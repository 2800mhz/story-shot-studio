import type {
  ArchitecturalNarrativeProgression,
  ArchitecturalNarrativeStage,
  Character,
  Location,
  TimeContext,
  SceneReference,
  PromptAnalysis,
} from '@/types';
import { aiProvider } from './aiProvider';

// ─── System Prompt ────────────────────────────────────────────────────────────

const ARCHITECTURAL_NARRATIVE_PROMPT_SYSTEM = `You are an elite cinematic prompt engineer for AI image generation tools (Midjourney, Runway, Flow AI).
Your prompts are used for documentary and historical films. Every image must feel like a frame from a real photograph or archival footage.

ARCHITECTURAL NARRATIVE PROGRESSION PROTOCOL:
You are generating a series of N independent prompts for an ARCHITECTURAL NARRATIVE PROGRESSION.
Each prompt depicts a specific stage in the narrative — a STATIC FROZEN MOMENT at a particular point in time.

ANCHOR RULE (CRITICAL):
The progression anchor is the ETERNAL VISUAL THREAD across all stages.
- The anchor MUST appear visibly in EVERY stage prompt
- Position anchor at PRIMARY FOCUS or CENTER of composition
- If anchor has an evolution state for this stage, show EXACTLY that state
- Never cut the anchor out of frame, never obscure it

CAMERA STRATEGY RULES:

IF strategy = "progressive_elevation":
  Stage 1: Ground level, camera close to anchor, wide angle showing anchor + minimal context
  Stage 2: Low elevation, anchor + emerging surroundings
  Stage 3: Medium elevation, anchor center + expanding context
  Stage 4: High elevation, anchor clearly visible + wide context
  Stage 5+: Aerial view, anchor at center + full scope visible
  RULE: Each stage raises camera height slightly; anchor progressively integrates with larger context

IF strategy = "circular_orbit":
  All stages: IDENTICAL height and distance from anchor
  Each stage: Camera rotated ~[360/stageCount] degrees around anchor
  Anchor: ALWAYS centered and primary focus
  Surrounding context: Revealed progressively through orbit rotation
  RULE: Never change height; only rotate azimuth angle

IF strategy = "zoom_out":
  Stage 1: Extreme close-up / macro detail of anchor
  Stage 2-N-1: Progressive zoom out, anchor shrinks but remains visible
  Stage N: Wide landscape view, anchor integrated into large context
  RULE: Anchor starts filling frame, ends as one element among many

IF strategy = "fixed_with_change":
  ALL stages: Camera COMPLETELY LOCKED — same lens, same position, same angle
  Anchor: ALWAYS centered in frame
  Change: ONLY the visual state of anchor/subject changes
  Examples: Moon phases, day/night cycle, seasonal color change
  RULE: Any non-locked camera is an error for this strategy

IF strategy = "linear_approach":
  Stage 1: Anchor small/distant
  Stage N: Anchor fills frame (or reverse — starts close, ends distant)
  RULE: Linear dolly-in or pull-back; anchor always on same axis

IF strategy = "custom":
  Follow the camera description provided in the narrative metadata exactly.

STATIC FROZEN MOMENTS:
- Each prompt describes a STATIC frozen frame — NOT motion
- Use: "captured at this exact moment", "frozen in this stage", "at this precise point in time"
- NEVER use: "transitioning", "flowing", "morphing", "changing", "movement"
- Still photography style — no motion blur

ENTITY RULES:
- Embed all character fields VERBATIM in every prompt
- Embed all location fields VERBATIM in every stage
- Never invent details not in the entity blocks

DOCUMENTARY FEEL:
- People: moving through, gesturing, crouching — never posing
- Environmental cues: dust rising, fabric shifting in wind, smoke drifting
- Camera: slightly off-angle, as if a documentary crew happened to be there

NATURAL EYES: natural, dark brown, soft catchlights only. NO glowing, lit-from-within, or colored pupils.

ANTHROPOLOGICAL ACCURACY:
- NEVER base on film/TV adaptations
- Derive from period manuscripts, miniatures, coins, archaeological evidence

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
  "stages": [
    {
      "stageNumber": 1,
      "stageLabel": "Stage label from input",
      "timeProgress": 0,
      "shotType": "Stage 1 — Ground Level Wide",
      "summary": "Turkish stage description (copy from input)",
      "explanation": "Bu görselin ne gösterdiğinin Türkçe açıklaması (1 cümle, 'Bu görsel...' ile başla)",
      "prompt": "120-150 words, anchor visible, camera strategy enforced, static moment"
    }
  ],
  "optimizations": ["optimization applied", ...]
}`;

// ─── Generation Result ────────────────────────────────────────────────────────

export interface NarrativeGenerationResult {
  stages: ArchitecturalNarrativeStage[];
  analysis: PromptAnalysis;
  optimizations: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeLighting(raw: string): string {
  return raw
    .replace(/\bblinding\b/gi, 'intense')
    .replace(/\bblinding white[- ]gold\b/gi, 'warm gold')
    .replace(/\bblinding white\b/gi, 'bright')
    .replace(/\bsupernatural\b/gi, 'otherworldly')
    .replace(/\bethereal white[- ]gold\b/gi, 'soft gold')
    .replace(/\bcosmically bright\b/gi, 'softly luminous')
    .replace(/\bcosmically\b/gi, 'distantly')
    .replace(/\bfrozen light\b/gi, 'still, quiet light')
    .replace(/\bglowing eyes\b/gi, 'natural eyes with soft catchlights')
    .replace(/\bmystical glow\b/gi, 'soft ambient light')
    .replace(/\bspiritual light\b/gi, 'faint radiance')
    .replace(/\baura\b/gi, 'gentle illumination')
    .replace(/\bcosmic\b/gi, 'celestial');
}

const DEFAULT_ANALYSIS: PromptAnalysis = {
  complexity: 'high',
  difficultyScore: 7,
  hasCrowd: false,
  hasArchitecture: true,
  hasTransformation: true,
  hasHistoricalFigure: false,
  recommendedStyle: 'cinematic photorealistic',
  productionNotes: ['🏛️ Architectural narrative: multi-stage progression generation'],
};

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generates image prompts for each stage of an architectural narrative progression.
 * Unlike the standard 3-shot generator, this creates N prompts — one per stage —
 * each enforcing the narrative's camera strategy and anchor visibility rules.
 */
export async function generateArchitecturalNarrativePrompts(
  progression: ArchitecturalNarrativeProgression,
  masterPrompt: string,
  episodePrompt?: string,
  characters?: Character[],
  locations?: Location[],
  timeContexts?: TimeContext[],
  references?: SceneReference[],
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '16:9',
  onRetry?: () => void
): Promise<NarrativeGenerationResult> {
  const { stages, progressionAnchor, cameraProgression, promptGenerationStrategy } = progression;
  const stageCount = stages.length;

  // ── Entity header ──────────────────────────────────────────────────────────

  let entityHeader = '';

  // Time context
  if (timeContexts && timeContexts.length > 0) {
    let timeHeader = `=== SCENE SETTING (CRITICAL — DO NOT IGNORE) ===\n`;
    timeContexts.forEach(tc => {
      timeHeader += `Time/Era: ${tc.label}${tc.era ? ` (${tc.era})` : ''}\n`;
      if (tc.timeOfDay) timeHeader += `Time of day: ${tc.timeOfDay} — THIS IS THE MANDATORY LIGHTING CONDITION\n`;
      if (tc.lighting) timeHeader += `Lighting: ${sanitizeLighting(tc.lighting)}\n`;
      if (tc.historicalNotes) timeHeader += `Historical context: ${tc.historicalNotes}\n`;
    });
    timeHeader += `⚠️ THE SCENE MUST BE SET IN THIS TIME AND LOCATION.\n\n`;
    entityHeader = timeHeader;
  }

  // Characters
  if (characters && characters.length > 0) {
    const individualChars = characters.filter(c => !c.isCrowd);
    if (individualChars.length === 1) {
      const char = individualChars[0];
      entityHeader += `=== CHARACTER TO DEPICT: ${char.name}${char.role ? ` (${char.role})` : ''} ===\n`;
      entityHeader += `⚠️ EMBED ALL FIELDS VERBATIM IN EVERY STAGE PROMPT.\n`;
      if (char.age) entityHeader += `Age: ${char.age}\n`;
      if (char.ethnicity) entityHeader += `Phenotype/Ethnicity: ${char.ethnicity}\n`;
      if (char.physicalFeatures) entityHeader += `Facial features: ${char.physicalFeatures}\n`;
      if (char.hair) entityHeader += `Hair: ${char.hair}\n`;
      if (char.beard) entityHeader += `Beard/Facial hair: ${char.beard}\n`;
      if (char.clothing) entityHeader += `Costume: ${char.clothing}\n`;
      if (char.visualDescription) entityHeader += `Full visual description: ${char.visualDescription}\n`;
      entityHeader += `⚠️ MAINTAIN EXACT APPEARANCE ACROSS ALL ${stageCount} STAGES.\n\n`;
    } else if (individualChars.length > 1) {
      entityHeader += `=== MULTIPLE CHARACTERS IN THIS SCENE ===\n`;
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

  // Locations
  if (locations && locations.length > 0) {
    if (locations.length === 1) {
      const loc = locations[0];
      entityHeader += `=== LOCATION TO DEPICT: ${loc.name} ===\n`;
      entityHeader += `⚠️ EMBED THIS DESCRIPTION VERBATIM IN EVERY STAGE. CAMERA POSITION IDENTICAL ACROSS STAGES.\n`;
      if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
      entityHeader += `⚠️ SAME VANTAGE POINT EVERY STAGE.\n\n`;
    } else {
      entityHeader += `=== MULTIPLE LOCATIONS ===\n`;
      locations.forEach((loc, idx) => {
        entityHeader += `[${idx === 0 ? 'PRIMARY' : 'SECONDARY'}] ${loc.name}:\n`;
        if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
        entityHeader += '\n';
      });
    }
  }

  // ── Anchor block ───────────────────────────────────────────────────────────

  entityHeader += `=== ARCHITECTURAL NARRATIVE ANCHOR (CRITICAL — APPLIES TO ALL ${stageCount} STAGES) ===\n`;
  entityHeader += `Anchor: ${progressionAnchor.name}\n`;
  entityHeader += `Role: ${progressionAnchor.role}\n`;
  entityHeader += `Description: ${progressionAnchor.description}\n`;
  entityHeader += `Symbolism: ${progressionAnchor.symbolism}\n`;
  entityHeader += `Visibility requirement: ${progressionAnchor.visibility}\n`;
  entityHeader += `⚠️ The anchor (${progressionAnchor.name}) MUST appear visibly in EVERY stage prompt.\n`;
  if (progressionAnchor.evolutionAcrossStages && progressionAnchor.evolutionAcrossStages.length > 0) {
    entityHeader += `Anchor evolution:\n`;
    progressionAnchor.evolutionAcrossStages.forEach((evo, i) => {
      entityHeader += `  Stage ${i + 1}: ${evo}\n`;
    });
  }
  entityHeader += `=== END ANCHOR BLOCK ===\n\n`;

  // ── Camera block ───────────────────────────────────────────────────────────

  entityHeader += `=== CAMERA PROGRESSION STRATEGY: ${cameraProgression.strategy.toUpperCase()} ===\n`;
  entityHeader += `Description: ${cameraProgression.description}\n`;
  entityHeader += `Purpose: ${cameraProgression.purpose}\n`;
  entityHeader += `⚠️ ENFORCE THIS CAMERA STRATEGY IN EVERY STAGE PROMPT.\n\n`;

  // ── Stages list ────────────────────────────────────────────────────────────

  const stagesDescription = stages.map((s, idx) => {
    let line = `  Stage ${s.number} (${s.label}, ${s.timeProgress}%): ${s.description}`;
    line += ` | Anchor state: ${s.environmentalState.anchorState}`;
    line += ` | Camera: ${s.cameraDirection.height} level, ${s.cameraDirection.angle}`;
    const evo = progressionAnchor.evolutionAcrossStages?.[idx];
    if (evo) line += ` | Anchor evolution: ${evo}`;
    return line;
  }).join('\n');

  // ── References ─────────────────────────────────────────────────────────────

  const subjectRefs = references?.filter(r => r.referenceType === 'subject') || [];
  const styleRefs = references?.filter(r => r.referenceType === 'style') || [];

  // ── Master/episode prompt ──────────────────────────────────────────────────

  const effectivePrompt = episodePrompt
    ? `${masterPrompt}\n\nEPISODE STYLE OVERRIDE:\n${episodePrompt}`
    : masterPrompt;

  // ── User message assembly ──────────────────────────────────────────────────

  let userMessage = entityHeader;
  userMessage += `NARRATIVE SUBJECT: ${progression.narrativeSubject}\n`;
  userMessage += `NARRATIVE TYPE: ${progression.narrativeType}\n`;
  userMessage += `TRANSFORMATION DRIVER: ${progression.transformationDriver}\n`;
  userMessage += `NARRATIVE THEME: ${promptGenerationStrategy.narrativeTheme}\n\n`;

  userMessage += `🎬 ARCHITECTURAL NARRATIVE PROGRESSION — ${stageCount} STAGES\n`;
  userMessage += `Generate EXACTLY ${stageCount} prompts, one per stage below:\n\n`;
  userMessage += stagesDescription + '\n\n';

  userMessage += `CONSISTENCY RULES:\n`;
  userMessage += `- Camera strategy: ${cameraProgression.strategy} — enforce in EVERY stage\n`;
  userMessage += `- Anchor treatment: ${promptGenerationStrategy.anchorTreatment}\n`;
  userMessage += `- Anchor (${progressionAnchor.name}) must be visible in ALL ${stageCount} stages\n`;
  userMessage += `- Only the environmental/temporal elements change between stages\n\n`;

  if (subjectRefs.length > 0) {
    userMessage += `SUBJECT REFERENCES:\n${subjectRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n\n`;
  }
  if (styleRefs.length > 0) {
    userMessage += `STYLE REFERENCES:\n${styleRefs.map(r => `- ${r.description || r.filePath}`).join('\n')}\n\n`;
  }

  if (effectivePrompt) {
    userMessage += `MASTER PROMPT (apply to all stage prompts):\n${effectivePrompt}\n\n`;
  }

  const arSuffix = `--ar ${aspectRatio} --v 6`;
  userMessage += `🎬 ASPECT RATIO: ${aspectRatio} — append "--ar ${aspectRatio} --v 6" to every prompt.\n`;
  userMessage += `Generate ${stageCount} stage prompts now.`;

  // ── AI call ────────────────────────────────────────────────────────────────

  function tryParse(raw: string) {
    const c = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(c);
  }

  let parsed: {
    stages?: Array<{
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
    const rawContent = await aiProvider.generateContent(
      userMessage,
      ARCHITECTURAL_NARRATIVE_PROMPT_SYSTEM,
      { operationType: 'architectural_narrative_generation' }
    );
    parsed = tryParse(rawContent);
  } catch (firstErr) {
    console.error('[architecturalNarrativePromptGenerator] First attempt failed, retrying...', firstErr);
    onRetry?.();
    const retryMessage = userMessage + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.';
    const retryContent = await aiProvider.generateContent(
      retryMessage,
      ARCHITECTURAL_NARRATIVE_PROMPT_SYSTEM,
      { operationType: 'architectural_narrative_generation_retry' }
    );
    try {
      parsed = tryParse(retryContent);
    } catch (secondErr) {
      console.error('[architecturalNarrativePromptGenerator] Retry failed.', secondErr);
      throw new Error('Invalid JSON in architectural narrative prompt response (after retry)');
    }
  }

  if (!parsed.stages || !Array.isArray(parsed.stages)) {
    throw new Error('Invalid architectural narrative prompt response format: missing stages array');
  }

  // ── Build result stages ────────────────────────────────────────────────────

  const resultStages: ArchitecturalNarrativeStage[] = parsed.stages.map((p, idx) => {
    const originalStage = stages[idx] || stages[stages.length - 1];
    const rawPrompt = p.prompt || '';
    const promptText = /--ar\s+[\d:]+/.test(rawPrompt) ? rawPrompt : `${rawPrompt} ${arSuffix}`.trim();

    return {
      ...originalStage,
      generatedPrompt: promptText,
      shotType: p.shotType || `Stage ${idx + 1}`,
    };
  });

  // Fill any missing stages with placeholder
  while (resultStages.length < stages.length) {
    const idx = resultStages.length;
    resultStages.push({
      ...stages[idx],
      generatedPrompt: '',
      shotType: `Stage ${idx + 1}`,
    });
  }

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

  return { stages: resultStages, analysis, optimizations };
}

import type {
  ArchitecturalNarrativeProgression,
  ArchitecturalNarrativeType,
  CameraProgressionStrategy,
  AnchorRole,
  ArchitecturalNarrativeStage,
  ProgressionAnchor,
  EnvironmentalSnapshot,
} from '@/types';
import { aiProvider } from './aiProvider';

// ─── System Prompt ────────────────────────────────────────────────────────────

const ARCHITECTURAL_NARRATIVE_SYSTEM_PROMPT = `You are an expert in architectural narrative analysis for documentary film production.
Your task is to detect whether a scene text describes a TRANSFORMATION OVER TIME that constitutes an architectural narrative progression.

ARCHITECTURAL NARRATIVE DETECTION:

An architectural narrative is present when the text describes:
1. Multiple phases/stages of transformation (city growth, natural decay, cyclical change)
2. A constant anchor element (well, tree, mountain, moon, lake basin, glacier core)
3. Progressive camera revelation or fixed observation
4. Time spans from years to centuries

NARRATIVE TYPES:
- urban_growth: City/settlement expanding over time (wells, roads, buildings appearing)
- environmental_transformation: Nature changing (glaciers, lakes, forests, deserts)
- temporal_cycle: Cyclic phenomena (moon phases, seasons, tides)
- geological_process: Slow earth change (erosion, volcano, canyon formation)
- metamorphosis: Biological or social transformation (forest regrowth, civilization collapse)
- custom: Any other progression type

CAMERA STRATEGIES:
- progressive_elevation: Camera rises from ground level to aerial as scope expands
- circular_orbit: Camera orbits the anchor at constant height, revealing 360° context
- linear_approach: Camera moves toward or away from the anchor linearly
- zoom_out: Starts macro/extreme close-up, progressively zooms out to landscape
- fixed_with_change: Camera completely locked — only subject state changes (moon phases, day/night)
- custom: Any other camera logic

ANCHOR ROLES:
- origin: Where everything begins from (sacred well, founding stone, seed)
- center: Spatial center of transformation (city core, lake basin)
- witness: Observes without changing (moon, distant mountain)
- transformation_locus: Primary site of change (glacier surface, forest floor)
- constant_reference: Visual constant among changing elements

DETECTION RULES:
- If text mentions time words: "yüzyıllar", "nesiller", "zamanla", "centuries", "generations", "over time" → LIKELY narrative
- If text lists sequential stages: "önce...sonra...", "ilk...ardından...", "first...then..." → LIKELY narrative
- If text describes stages 3 or more phases → LIKELY narrative
- If text has only 1-2 events without clear progression → NOT a narrative (return isArchitecturalNarrative: false)

STAGE COUNT GUIDANCE:
- moon phases: 8 stages (new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent)
- city growth: 4-8 stages depending on text detail
- glacier melting: 4-6 stages
- forest regrowth: 5-7 stages
- season cycle: 4 stages
- Default: 4-5 stages if unclear

RESPONSE FORMAT (JSON only, no markdown):
{
  "isArchitecturalNarrative": true,
  "narrativeSubject": "City/Lake/Glacier/Moon etc",
  "narrativeType": "urban_growth",
  "transformationDriver": "Water discovery/Climate change/Time/Human intervention",
  "anchor": {
    "name": "Sacred Well",
    "description": "Ancient stone well at city center",
    "role": "origin",
    "symbolism": "Life source, city's founding reason",
    "visibility": "always",
    "evolutionAcrossStages": ["Bare stone well", "Stone well with wooden beam", "Shrine well with decorations", "Monumental fountain"]
  },
  "cameraStrategy": "progressive_elevation",
  "cameraDescription": "Camera begins at ground level next to the well, progressively rises to aerial view as city grows",
  "cameraPurpose": "Reveals increasing scope of growth while keeping the well as spatial anchor",
  "stageCount": 5,
  "stages": [
    {
      "number": 1,
      "label": "Foundation (Year 0)",
      "timeProgress": 0,
      "description": "Bare well with first tents around it",
      "environmentalState": {
        "primaryChange": "First arrival — tents and temporary shelters",
        "anchorState": "Bare stone well, freshly dug",
        "symbolicElements": ["tents", "camels", "bare earth"],
        "atmosphere": "Dusty, hot, sparse",
        "timeframeDescription": "Year 0 — first settlement"
      },
      "cameraDirection": {
        "height": "ground",
        "angle": "wide_establishing",
        "focus": "anchor_to_context"
      }
    }
  ],
  "promptConsistency": "progressive_movement",
  "anchorTreatment": "always_centered",
  "narrativeTheme": "Transformation driven by discovery of life-giving water",
  "cameraPurpose": "Progressive elevation reveals the city growing around its founding well"
}

If NOT an architectural narrative:
{ "isArchitecturalNarrative": false }`;

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Analyzes scene text to detect if it describes an architectural narrative progression.
 * Returns a full ArchitecturalNarrativeProgression or null if not detected.
 */
export async function analyzeArchitecturalNarrative(
  sceneText: string,
  sceneVisualNote?: string
): Promise<ArchitecturalNarrativeProgression | null> {
  const userMessage = `SCENE TEXT:\n${sceneText}${sceneVisualNote ? `\n\nVISUAL NOTE: ${sceneVisualNote}` : ''}\n\nAnalyze if this is an architectural narrative progression. Return JSON only.`;

  try {
    const rawContent = await aiProvider.generateContent(
      userMessage,
      ARCHITECTURAL_NARRATIVE_SYSTEM_PROMPT,
      { operationType: 'architectural_narrative_analysis' }
    );

    const cleaned = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      isArchitecturalNarrative: boolean;
      narrativeSubject?: string;
      narrativeType?: string;
      transformationDriver?: string;
      anchor?: {
        name: string;
        description: string;
        role: string;
        symbolism: string;
        visibility: string;
        evolutionAcrossStages?: string[];
      };
      cameraStrategy?: string;
      cameraDescription?: string;
      cameraPurpose?: string;
      stageCount?: number;
      stages?: Array<{
        number: number;
        label: string;
        timeProgress: number;
        description: string;
        environmentalState: {
          primaryChange: string;
          anchorState: string;
          symbolicElements: string[];
          atmosphere: string;
          timeframeDescription: string;
        };
        cameraDirection: {
          height: string;
          angle: string;
          focus: string;
        };
      }>;
      promptConsistency?: string;
      anchorTreatment?: string;
      narrativeTheme?: string;
    };

    if (!parsed.isArchitecturalNarrative) {
      return null;
    }

    // Build stages
    const rawStages = parsed.stages || [];
    const stages: ArchitecturalNarrativeStage[] = rawStages.map(s => ({
      number: s.number,
      label: s.label,
      timeProgress: s.timeProgress,
      description: s.description,
      environmentalState: {
        primaryChange: s.environmentalState?.primaryChange || '',
        anchorState: s.environmentalState?.anchorState || '',
        symbolicElements: s.environmentalState?.symbolicElements || [],
        atmosphere: s.environmentalState?.atmosphere || '',
        timeframeDescription: s.environmentalState?.timeframeDescription || '',
      } satisfies EnvironmentalSnapshot,
      cameraDirection: {
        height: (s.cameraDirection?.height as ArchitecturalNarrativeStage['cameraDirection']['height']) || 'medium',
        angle: s.cameraDirection?.angle || 'wide_establishing',
        focus: s.cameraDirection?.focus || 'anchor_to_context',
      },
    }));

    // Build anchor
    const rawAnchor = parsed.anchor;
    const anchor: ProgressionAnchor = {
      name: rawAnchor?.name || 'Unknown anchor',
      description: rawAnchor?.description || '',
      role: (rawAnchor?.role as AnchorRole) || 'constant_reference',
      symbolism: rawAnchor?.symbolism || '',
      visibility: (rawAnchor?.visibility as ProgressionAnchor['visibility']) || 'always',
      evolutionAcrossStages: rawAnchor?.evolutionAcrossStages,
    };

    const cameraStrategy = (parsed.cameraStrategy as CameraProgressionStrategy) || 'fixed_with_change';
    const narrativeType = (parsed.narrativeType as ArchitecturalNarrativeType) || 'custom';

    // Derive consistency strategy from camera strategy
    const consistencyMap: Record<CameraProgressionStrategy, ArchitecturalNarrativeProgression['promptGenerationStrategy']['consistency']> = {
      progressive_elevation: 'progressive_movement',
      circular_orbit: 'orbital',
      linear_approach: 'progressive_movement',
      zoom_out: 'progressive_movement',
      fixed_with_change: 'camera_locked',
      custom: 'contextual',
    };

    const progression: ArchitecturalNarrativeProgression = {
      id: crypto.randomUUID(),
      narrativeSubject: parsed.narrativeSubject || 'Unknown',
      narrativeType,
      transformationDriver: parsed.transformationDriver || 'Time',
      progressionAnchor: anchor,
      cameraProgression: {
        strategy: cameraStrategy,
        description: parsed.cameraDescription || '',
        purpose: parsed.cameraPurpose || '',
      },
      stages,
      promptGenerationStrategy: {
        consistency: consistencyMap[cameraStrategy] || 'contextual',
        anchorTreatment: (parsed.anchorTreatment as ArchitecturalNarrativeProgression['promptGenerationStrategy']['anchorTreatment']) || 'always_centered',
        narrativeTheme: parsed.narrativeTheme || '',
        cameraPurpose: parsed.cameraPurpose || '',
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    return progression;
  } catch (err) {
    console.warn('[architecturalNarrativeAnalyzer] Failed to analyze:', err);
    return null;
  }
}

/**
 * Quick heuristic check (no API call) — returns true if the text has
 * keywords or patterns that strongly suggest a multi-stage progression narrative.
 * Used as a pre-filter before calling the expensive AI analysis.
 */
export function mightBeArchitecturalNarrative(text: string, visualNote?: string): boolean {
  const combined = `${text} ${visualNote || ''}`.toLowerCase();

  // Timelapse visual note prefix
  if (/^timelapse:/i.test((visualNote || '').trim())) return true;

  // Time progression keywords (Turkish + English)
  const timeProgressionRe =
    /yüzyıllar|nesiller|zamanla|zaman içinde|asırlarca|yıllar boyunca|dönemler|centuries|generations|over time|across time|through time|gradually|progressively|stage[s]?|phase[s]?|aşama[lar]?/i;

  // Multi-stage description keywords
  const multiStageRe =
    /önce.*sonra|ilk.*ardından|başlangıçta.*zamanla|first.*then.*finally|stage \d|aşama \d|phase \d|evre \d/i;

  // Architectural/environmental transformation keywords
  const transformationRe =
    /büyüdü|gelişti|genişledi|dönüştü|değişti|erid[i|mek]|kurudi|grow|expand|transform|melt|dry[ing]?|regrow|rebuild|evolv/i;

  return (
    timeProgressionRe.test(combined) ||
    multiStageRe.test(combined) ||
    transformationRe.test(combined)
  );
}

import type { SceneCard, Character, Location, TimeContext, PromptCard, PromptAnalysis, GenerationResult, SceneAnalysis, SceneReference, NarrativeLayer } from '@/types';
import { aiProvider } from './aiProvider';

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT_GENERATION_SYSTEM_PROMPT — Evrensel Belgesel Sistemi
// Flow AI / Nano Banana Pro + Midjourney + Runway uyumlu
// Tarihsel, modern, bilimsel, soyut — her sahne tipi için çalışır
// ─────────────────────────────────────────────────────────────────────────────

export const PROMPT_GENERATION_SYSTEM_PROMPT = `You are an elite prompt engineer for documentary film visual production.
Your prompts are used with Flow AI (Nano Banana Pro model), Midjourney, and Runway.
Every image must feel like a frame pulled from a real documentary — not a fantasy, not a museum exhibit, not a stock photo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — READ THE SCENE SETTING BLOCK FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before writing a single word of a prompt, read:
  - timeContext.era → what historical period or present day
  - timeContext.timeOfDay → lighting condition (absolute)
  - timeContext.historicalNotes → what is happening RIGHT NOW in this scene
  - visualStyle → which visual mode to use (see Step 2)
  - characters present → are there people? named or unnamed?
  - locations present → what physical space?

These fields are the ground truth. Never override them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — VISUAL MODE ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read the visualStyle field and route accordingly:

  "cinematic"   → Standard documentary rules (sections below)
  "symbolic"    → Painterly / illustrated mode (see SYMBOLIC section)
  "scientific"  → Scientific visualization mode (see SCIENTIFIC section)

If visualStyle is missing or null → default to "cinematic".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — ERA DETECTION (for cinematic mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Determine the era from timeContext.era and apply the correct visual world:

ERA: ANCIENT / MEDIEVAL (pre-1500)
  Examples: 13th century Anatolia, Seljuk period, Mongol era, Ottoman early period
  Visual world:
    - Mud brick, carved stone, wood, wool, leather, copper
    - Warm candlelight, oil lamp, torch, open fire, sunlight through small windows
    - Dust, earth, animal smell implied through texture
    - Clothing: handwoven, layered, period-accurate — derive from manuscripts NOT TV
    - No electricity, no glass windows, no modern materials anywhere in frame

ERA: EARLY MODERN (1500–1900)
  Examples: Ottoman classical period, 18th century coffeehouses, 19th century reform era
  Visual world:
    - Stone buildings with larger windows, wooden interiors, brass and tile
    - Candles and oil lamps still dominant, some gas light late in period
    - Printed books, illustrated manuscripts, ink on paper
    - Clothing evolves — consult period paintings and photographs

ERA: MODERN (1900–1980)
  Examples: Early Turkish Republic, 1950s Anatolia, mid-century urban Turkey
  Visual world:
    - Film grain, muted palette, black and white or desaturated color
    - Concrete, plaster, electric light (warm incandescent)
    - Newspapers, radios, early television
    - People in modern clothing but conservative, modest, regional variation

ERA: CONTEMPORARY (1980–present)
  Examples: Modern Istanbul, today's Anatolia, present-day anywhere
  Visual world:
    - Full color, digital clarity or deliberate cinematic grain
    - Glass, steel, plastic, neon, LED, screens
    - Modern clothing, smartphones, cars, urban infrastructure
    - Can be shot anywhere in the world — no restrictions

ERA: TIMELESS / UNIVERSAL
  Examples: Abstract concepts, human nature, emotions across all eras
  Visual world:
    - Choose ONE anchor — either ancient OR modern, not both mixed
    - The anchor should serve the emotional content of the scene
    - Prefer natural environments or simple human gestures over architecture

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — HUMAN SUBJECT RULES (THE REAL RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THE FUNDAMENTAL PRINCIPLE:
This is a documentary about PEOPLE. Humans must appear when the scene calls for humans.
Never replace a human moment with an object just to avoid face complexity.
Objects and textures are used when they SERVE THE STORY — not as a default escape.

WHEN TO SHOW HUMANS:
  ✓ Scene text describes a person doing something → show that person doing it
  ✓ Scene describes an emotion or reaction → show a human experiencing it
  ✓ Scene describes dialogue or conversation → show people in conversation
  ✓ Scene describes a crowd, gathering, market → show people in that context
  ✓ Scene describes laughter, grief, tension → show a human body expressing it

WHEN TO USE OBJECTS / ENVIRONMENTS INSTEAD:
  ✓ Scene describes a concept (justice, time, tradition) with no specific person
  ✓ Scene describes a historical process over centuries → architecture or landscape
  ✓ Scene describes written/printed culture → books, manuscripts, newspapers
  ✓ Scene is explicitly about a place or object

NEVER default to "old manuscript on a wooden table" when the scene is about a person.

─── FACE RULES ────────────────────────────────────────────

Faces CAN and SHOULD be visible to convey human emotion, connection, and life.
However, NEVER create "passport-style" portraits or direct-to-camera poses.

ALL CHARACTERS (Named or Unnamed):
  Capture people in candid, natural moments of interaction:
    ✓ Genuine emotional expressions — laughing, smiling, grieving, concentration
    ✓ Moments of connection — hugging, conversing, working together
    ✓ Cinematic angles — 3/4 view, profile, or natural frontal WITHOUT looking at the lens
    ✓ Caught-in-motion — deeply engaged in their action or with each other

  FORBIDDEN FOR ALL PEOPLE:
    ✗ Direct eye contact with the camera lens
    ✗ Stiff, posed frontal portraits (like an ID card or passport photo)
    ✗ Addressing or posing for the camera/viewer
    ✗ Frozen, "stock photo" artificial smiles

  NOTE: Close-ups can show intense facial emotion, but eyes must look off-camera.
  You can still use back views or silhouettes when it serves the story scale, but faces ARE allowed and encouraged for intimate, human moments.

CROWD:
  ✓ Backlit silhouettes from behind or bird's-eye
  ✓ Sea of heads from elevated angle
  ✓ Individual in foreground from behind, crowd blurred behind
  FORBIDDEN: individual faces readable in crowd

MODERN PEOPLE (contemporary era):
  All the same rules apply. A modern person from behind on a busy Istanbul street
  is a valid and strong documentary frame. Use it.

─── POSE AND COMPOSITION RULES ───────────────────────────

FORBIDDEN in every prompt regardless of era:
  ✗ Person posing for camera — casting call, hero pose, portrait studio
  ✗ Two groups facing each other symmetrically — theater-stage illusion
  ✗ Armies or crowds arranged to fit the frame neatly
  ✗ Direct eye contact with viewer
  ✗ Frozen smile or performed emotion (stock photo energy)

REQUIRED:
  ✓ Caught-in-motion — the person is doing something, not posing
  ✓ Organic, candid, observational documentary feel
  ✓ Body language tells the story — slumped shoulders, tense hands, open palms
  ✓ Environment interacting with person — wind in fabric, light on skin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — SHOT CONSTRUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Produce 3 prompts per scene — different angles, different information each time.
Each prompt must add something the others don't.

PROMPT 1 — WIDE / ESTABLISHING:
  Answer: WHERE are we? What is the SCALE of this moment?
  Show: full environment + person/subject within it
  Human presence: distant figures interacting, embedded in the space
  Motion potential (Flow AI): parallax, slow pan across environment

PROMPT 2 — MEDIUM / ACTION:
  Answer: WHAT is happening? WHO is doing it?
  Show: person in action, gesture, movement, interaction (hugging, talking, etc.)
  Human presence: visible faces in candid interaction, strong expressions — NO looking at lens
  Motion potential: subtle drift, slow zoom toward subject

PROMPT 3 — CLOSE-UP / DETAIL:
  Answer: What is the TEXTURE of this moment? The smallest true thing?
  Show: expressive face caught in emotion, hands in motion, fabric texture
  Human presence: candid facial expressions, hands, arms — eyes MUST look off-camera
  Motion potential: Ken Burns zoom, micro detail reveal

SHOT SELECTION LOGIC:
  Scene has a crowd or landscape → Wide must be truly wide (aerial or extreme wide)
  Scene has one person in action → Medium is the anchor shot
  Scene is about emotion or interiority → Close-up carries the weight
  Never make all 3 prompts the same scale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — LIGHTING AND COLOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lighting comes from timeContext.timeOfDay — this is ABSOLUTE.
  "gece" → night, moonlight or fire or oil lamp only. No daylight.
  "sabah" → early morning, soft golden-pink light, long shadows
  "gündüz" → full daylight, era-appropriate light source
  "akşam" → golden hour, warm amber, long shadows
  "iftar vakti" → candlelight, blue hour exterior, warm interior

ERA-APPROPRIATE LIGHT SOURCES:
  Ancient / Medieval → fire, oil lamp, torch, sunlight through small openings
  Early Modern → candles, oil, early gas — no electric
  Modern → incandescent bulb, neon, fluorescent, daylight through large windows
  Contemporary → full modern lighting palette, LED, screen glow acceptable

COLOR GRADING BY ERA AND TONE:
  Ancient warmth: deep amber, terracotta, shadow-heavy, desaturated
  Medieval tension: cool grey-blue, torchlight orange accent, heavy shadow
  Modern Anatolia: muted palette, warm dust, faded color
  Contemporary urban: full saturation OR deliberate cinematic desaturation
  Emotional scenes (grief, joy, isolation): push the color toward the emotion

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — ENTITY INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHARACTER blocks: embed every physical attribute verbatim across all 3 prompts.
  Age, build, clothing, fabric, accessories — repeat in Wide, Medium, Close-up.
  Do not assume the model remembers from Prompt 1.
  For clothing: name the specific garment, fabric, color. "robe" is not enough.
  Source: period manuscripts, miniatures, archaeological evidence — NOT film or TV.

LOCATION blocks: embed the PERMANENT architectural description.
  The current emotional state of the location (siege, celebration, abandonment)
  belongs in timeContext.historicalNotes — not in the location description.
  Location description = physical structure. State = historicalNotes.

MULTI-CHARACTER scenes:
  Position characters spatially: foreground / midground / background
  Maximum 3 subjects with clear visual separation
  Use depth of field to separate planes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — FLOW AI MOTION COMPATIBILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every image will be animated. Design for motion from the start.

MOTION-READY RULES:
  - One clear subject with breathing room around it
  - Depth layers: sharp foreground + blurred mid + dark background
  - Subject slightly off-center (rule of thirds)
  - No perfectly symmetrical compositions — produces uncanny motion
  - Static moment with IMPLIED motion (about to move, just stopped)

MOTION KILLERS — avoid:
  ✗ Multiple subjects at equal sharpness
  ✗ Flat compositions with no depth
  ✗ Extremely busy textures filling 100% of frame
  ✗ Bright white backgrounds
  ✗ Pure symmetry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYMBOLIC MODE (visualStyle: "symbolic")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use when the scene is explicitly metaphorical or mythological.
  - Painterly, illustrated aesthetic
  - Reference: the specific manuscript or iconographic tradition of that culture
    (Turkic miniature, Ottoman illumination, Central Asian Tengrist art)
  - Character and location entity details still apply
  - Face rules still apply
  - Eyes: natural only — no glowing, no supernatural light

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCIENTIFIC MODE (visualStyle: "scientific")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use when the scene describes biology, neurology, psychology, or physiology.
  - Macro photography aesthetic — NOT sci-fi, NOT neon hologram
  - Nano Banana Pro renders well: organic textures, macro detail, warm studio light
  - Nano Banana Pro fails at: floating glowing neural networks, electric blue void
  - Human body parts allowed: hands, skin texture, jaw line, macro details
  - Faces allowed only as macro texture or parts, no direct eye contact
  - Color: warm amber for anatomy, deep walnut for neural concepts (NOT electric blue)
  - End suffix: "photorealistic documentary photography, Nano Banana Pro,
    Flow AI motion compatible"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT MAKES A PROMPT FAIL — NEVER DO THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ Replacing every human scene with "old manuscript on wooden table"
✗ Adding "dust motes and light shafts through arched windows" to every scene
✗ Generic "Silk Road caravan at sunset" when scene has nothing to do with it
✗ Making every interior look like the same stone-walled archive room
✗ Ignoring the era — writing ancient aesthetic for a modern scene
✗ Ignoring people — writing environment-only when scene is about a person
✗ Sci-fi neural networks for biology scenes
✗ Electric blue glowing anything (Nano Banana Pro can't render this cleanly)
✗ Oversaturated fantasy colors for historical documentary
✗ Text, labels, arrows, diagrams in any prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Length: 100–140 words per prompt. Precise. No filler.
Language: English only in prompts.
Structure: subject → context → light → camera → mood → technical suffix

TECHNICAL SUFFIX for cinematic/symbolic:
  "anthropologically accurate, based on period sources not film adaptations,
  documentary realism, --ar [ratio] --v 6"

TECHNICAL SUFFIX for scientific:
  "photorealistic documentary photography, Nano Banana Pro,
  Flow AI motion compatible, --ar [ratio]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT — JSON only, no markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "analysis": {
    "detectedEra": "ancient|early_modern|modern|contemporary|timeless",
    "visualMode": "cinematic|symbolic|scientific",
    "hasHumans": boolean,
    "humanVisibility": "visible_candid|silhouette|crowd|none",
    "complexity": "low|medium|high|extreme",
    "difficultyScore": 1-10,
    "hasCrowd": boolean,
    "hasArchitecture": boolean,
    "hasTransformation": boolean,
    "recommendedStyle": "cinematic|illustrated|scientific",
    "productionNotes": ["note1", "note2"]
  },
  "prompts": [
    {
      "shotType": "Wide Shot",
      "summary": "Turkish visual note — copy verbatim from input",
      "explanation": "Bu görsel... (1 cümle Türkçe, ne gösterdiğini açıkla)",
      "prompt": "100-140 word English prompt with correct technical suffix"
    },
    {
      "shotType": "Medium Shot",
      "summary": "Turkish visual note — copy verbatim",
      "explanation": "Bu görsel... (1 cümle Türkçe)",
      "prompt": "100-140 word English prompt"
    },
    {
      "shotType": "Close-up",
      "summary": "Turkish visual note — copy verbatim",
      "explanation": "Bu görsel... (1 cümle Türkçe)",
      "prompt": "100-140 word English prompt"
    }
  ],
  "optimizations": ["what was applied or adjusted"]
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
  const layer: NarrativeLayer = scene.narrativeLayer ?? 'historical';

  // ─── VISUAL STYLE NOTE ─────────────────────────────────────────────────────
  let userMessage = `SAHNE METNİ:\n${scene.text}\n\n`;
  userMessage += `TÜRKÇE GÖRSEL NOT: "${scene.visualNote}"\n\n`;

  // styleNote: visualStyle + narrativeLayer birlikte değerlendirilir
  let styleNote: string;
  if (scene.visualStyle === 'symbolic') {
    styleNote = `\nVISUAL STYLE: Symbolic/metaphorical scene inspired by Central Asian Tengrist art traditions.
Use painterly, ethereal aesthetics. Reference: Turkic shamanic iconography, Inner Asian manuscript
illumination, cosmic symbolism. NOT photorealistic — more like a painted vision or dream sequence.
Avoid literal interpretation of metaphors.\n`;
  } else if (scene.visualStyle === 'scientific' || layer === 'scientific') {
    styleNote = `\nVISUAL STYLE: Scientific documentary mode — MACRO PHOTOGRAPHY AESTHETIC.
NOT sci-fi, NOT neon hologram, NOT electric blue void.
Use: organic textures, micro biology, warm amber studio light, photorealistic macro detail.
Setting: modern neuroscience laboratory, clinical environment, or abstract biological close-up.
NO historical characters, costumes, or architecture in this scene.\n`;
  } else if (scene.visualStyle === 'abstract' || layer === 'universal') {
    styleNote = `\nVISUAL STYLE: Universal/timeless documentary — emotionally anchored but era-unspecified.
Choose ONE visual anchor (ancient OR modern, not mixed). Prefer natural light, human gesture, landscape.
NO anachronistic mixing. Let the emotion carry the frame.\n`;
  } else {
    styleNote = `\nVISUAL STYLE: Photorealistic, cinematic documentary style.\n`;
  }
  userMessage += styleNote;

  // ─── UNIVERSAL CAMERA RULE ─────────────────────────────────────────────────
  // Bu kural karakterden bağımsız, HER sahneye eklenir
  const UNIVERSAL_CAMERA_RULE = `
=== CAMERA RULE (APPLIES TO ALL SHOTS, NO EXCEPTIONS) ===
✓ Candid, documentary-style composition — people caught in action, not posing
✓ Faces CAN and SHOULD appear to convey emotion (laughing, concentrating, grieving)
✓ Eyes must look OFF-camera — at another person, at an object, into the distance
✗ NEVER: direct eye contact with the lens
✗ NEVER: stiff passport-style / vesikalık portrait
✗ NEVER: symmetrical posed group photo
✗ NEVER: artificial frozen smile
`;

  // ─── ENTITY HEADER ────────────────────────────────────────────────────────
  let entityHeader = '';

  // Bilimsel sahnelerde tarihsel entity'leri sıfırla — Scientific Override
  const isScientificOverride = layer === 'scientific' || scene.visualStyle === 'scientific';

  if (isScientificOverride) {
    // ── BİLİMSEL MOD: Tarihsel entity'ler enjekte edilmez ──────────────────
    entityHeader = `=== SCIENTIFIC MODE — HISTORICAL ENTITIES SUSPENDED ===
This scene describes a biological/neurological/scientific process.
DO NOT render historical characters (e.g. Nasreddin Hoca), Ottoman costumes, or ancient architecture.
INSTEAD RENDER:
- Macro photography of organic tissue, neurons, muscle fiber, or cellular structures
- Modern neuroscience or biology laboratory environment (clinical, precise, warm amber lighting)
- Abstract biological visualization: cross-sections, macro skin texture, brain tissue
- If a human appears: anonymous, contemporary clothing, seen from behind or as body part only
${UNIVERSAL_CAMERA_RULE}\n`;

  } else if (layer === 'universal') {
    // ── EVRENSEL MOD: Tarihsel entity opsiyonel, çıpa seçilir ──────────────
    entityHeader = `=== UNIVERSAL / TIMELESS MODE ===
This scene describes a universal human experience (emotion, instinct, social bond).
Choose ONE era anchor — either anchor it in antiquity OR in the present, never both.
Prefer: natural environments, simple human gestures, unadorned settings.
Avoid: anachronistic mixing, specific cultural markers unless they serve emotion.
${UNIVERSAL_CAMERA_RULE}\n`;

    // Universal modda karakter bağlamı varsa yine de ekle (ama "timeless" damgasıyla)
    if (characters.length > 0) {
      const individualChars = characters.filter(c => !c.isCrowd);
      if (individualChars.length > 0) {
        entityHeader += `=== OPTIONAL CHARACTER REFERENCE (timeless context) ===\n`;
        individualChars.forEach(char => {
          entityHeader += `${char.name}: ${char.visualDescription || ''}\n`;
        });
        entityHeader += `Note: If shown, use archetypal/universal version — not period-specific.\n\n`;
      }
    }

  } else {
    // ── TARİHSEL / MODERN MOD: Normal entity injection ────────────────────
    const FACE_RULE = `⚠️ CAMERA RULE:
Faces CAN and SHOULD be visible, showing natural emotion and interactions (laughing, hugging, talking).
However, ABSOLUTELY NO direct eye contact with the camera lens, and NO stiff passport-style (vesikalık) portraits.
Subjects must look off-camera or at each other. Embed all clothing and physical details verbatim.\n`;

    if (characters.length > 0) {
      const individualChars = characters.filter(c => !c.isCrowd);

      if (individualChars.length === 1) {
        const char = individualChars[0];
        entityHeader += `=== CHARACTER TO DEPICT: ${char.name}${char.role ? ` (${char.role})` : ''} ===\n`;
        entityHeader += `⚠️ EMBED ALL OF THE FOLLOWING FIELDS VERBATIM INTO EVERY PROMPT. DO NOT OMIT OR SUMMARIZE ANY FIELD.\n`;
        entityHeader += FACE_RULE;
        if (char.age) entityHeader += `Age/build: ${char.age}\n`;
        if (char.ethnicity) entityHeader += `Phenotype/Ethnicity (costume and posture context): ${char.ethnicity}\n`;
        if (char.physicalFeatures) entityHeader += `Physical features: ${char.physicalFeatures}\n`;
        if (char.hair) entityHeader += `Hair: ${char.hair}\n`;
        if (char.beard) entityHeader += `Beard: ${char.beard}\n`;
        if (char.clothing) entityHeader += `Costume (every garment and accessory): ${char.clothing}\n`;
        if (char.visualDescription) entityHeader += `Full visual description: ${char.visualDescription}\n`;
        entityHeader += `⚠️ MAINTAIN EXACT APPEARANCE ACROSS ALL PROMPTS. FACES VISIBLE BUT NO DIRECT EYE CONTACT WITH LENS.\n\n`;

      } else if (individualChars.length > 1) {
        entityHeader += `=== MULTIPLE CHARACTERS IN THIS SCENE ===\n`;
        entityHeader += `Compose ALL characters in the SAME frame. Embed ALL fields of EACH character verbatim.\n\n`;
        individualChars.forEach((char, idx) => {
          const position = idx === 0 ? 'FOREGROUND' : idx === 1 ? 'MIDGROUND' : 'BACKGROUND';
          entityHeader += `[${position}] ${char.name}${char.role ? ` (${char.role})` : ''}:\n`;
          entityHeader += `  ${FACE_RULE}`;
          if (char.age) entityHeader += `  Age/build: ${char.age}\n`;
          if (char.ethnicity) entityHeader += `  Phenotype/Ethnicity (costume context): ${char.ethnicity}\n`;
          if (char.physicalFeatures) entityHeader += `  Physical features: ${char.physicalFeatures}\n`;
          if (char.hair) entityHeader += `  Hair: ${char.hair}\n`;
          if (char.beard) entityHeader += `  Beard: ${char.beard}\n`;
          if (char.clothing) entityHeader += `  Costume: ${char.clothing}\n`;
          if (char.visualDescription) entityHeader += `  Full description: ${char.visualDescription}\n`;
          entityHeader += `  ⚠️ FACES VISIBLE INTERACTING BUT NO DIRECT EYE CONTACT WITH LENS.\n\n`;
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
    } else {
      // Karaktersiz tarihsel/modern sahnede yine de kamera kuralı enjekte edilir
      entityHeader += UNIVERSAL_CAMERA_RULE + '\n';
    }

    if (locations.length > 0) {
      if (locations.length === 1) {
        const loc = locations[0];
        entityHeader += `=== LOCATION TO DEPICT: ${loc.name} ===\n`;
        entityHeader += `⚠️ This is the PERMANENT ARCHITECTURAL description of the location.\n`;
        entityHeader += `⚠️ The current condition (damage, siege, intact, tense) is defined in SCENE SETTING above — use that for atmosphere.\n`;
        entityHeader += `⚠️ EMBED THE ARCHITECTURAL DESCRIPTION VERBATIM in every wide and medium shot.\n`;
        if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
        entityHeader += `⚠️ THIS EXACT ARCHITECTURE MUST APPEAR. Atmospheric state comes from SCENE SETTING, not this block.\n\n`;
      } else if (locations.length > 1) {
        entityHeader += `=== MULTIPLE LOCATIONS IN THIS SCENE ===\n`;
        entityHeader += `⚠️ These are PERMANENT ARCHITECTURAL descriptions. Current condition comes from SCENE SETTING above.\n`;
        locations.forEach((loc, idx) => {
          const pos = idx === 0 ? 'PRIMARY' : 'SECONDARY';
          entityHeader += `[${pos} LOCATION] ${loc.name}:\n`;
          if (loc.visualDescription) entityHeader += `${loc.visualDescription}\n`;
          entityHeader += '\n';
        });
      }
    }
  } // end of layer routing

  // ─── ZAMAN BAĞLAMI ──────────────────────────────────────────────────────────
  // Bilimsel sahnede TimeContext zaman etiketini bastır — kendi ortamını kurar
  if (!isScientificOverride && timeContexts && timeContexts.length > 0) {
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

  // ─── SAHNE ANALİZİ + TİMELAPSE PHASE OVERRIDE ──────────────────────────────
  let shotFormatOverride: string | null = null;

  if (sceneAnalysis) {
    userMessage += `🔍 SAHNE ANALİZİ (sceneAnalyzer sonucu):\n`;
    userMessage += `- narrativeType: ${sceneAnalysis.narrativeType}\n`;
    userMessage += `- temporalComplexity: ${sceneAnalysis.temporalComplexity}\n`;

    if (sceneAnalysis.narrativeType === 'timelapse') {
      // Phase-N formatı: sahne karmaşıklığına göre kaç faz üretileceği belirlenir
      const phaseCount = sceneAnalysis.temporalComplexity === 'complex' ? 5
        : sceneAnalysis.temporalComplexity === 'moderate' ? 4
        : 3;
      const phases = Array.from({ length: phaseCount }, (_, i) => `Phase ${i + 1}`);
      shotFormatOverride = phases.join(' → ');
      userMessage += `- ⚠️ TIMELAPSE DETECTED (${phaseCount} phases): ${shotFormatOverride}\n`;
      userMessage += `  Each prompt MUST show a DIFFERENT temporal state of the scene.\n`;
      userMessage += `  Phase 1 = beginning state / Phase ${phaseCount} = final transformed state.\n`;
      userMessage += `  Do NOT produce Wide/Medium/Close-up — produce temporal progression instead.\n`;
    } else if (sceneAnalysis.narrativeType === 'sequence') {
      userMessage += `- ℹ️ SEQUENCE DETECTED: Prompts should show sequential stages of the event\n`;
    }
    userMessage += '\n';
  }

  // ─── FOCUS DIRECTIVE (karaktersiz sahneler için) ─────────────────────────
  const hasCharacters = characters.length > 0;
  const hasLocations = locations.length > 0;
  let focusDirective = '';

  if (!isScientificOverride) {
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
  }

  if (focusDirective) {
    userMessage += focusDirective;
  }

  // ─── FİNAL KOMUT ────────────────────────────────────────────────────────────
  if (shotFormatOverride) {
    // Timelapse: Phase-N komut
    const phaseCount = shotFormatOverride.split('→').length;
    userMessage += `${phaseCount} aşamalı TIMELAPSE prompt üret (${shotFormatOverride}). `;
    userMessage += `Her aşamada farklı bir temporal durum gösterilmeli. `;
    userMessage += `Her prompt sonuna "--ar ${aspectRatio} --v 6 --no direct gaze, eye contact, looking at camera, posed portrait, passport photo, artificial smile" ekle.`;
  } else {
    userMessage += `3 farklı açıdan sinematik prompt üret. Her prompt'ta "${scene.visualNote}" notunun ruhunu koru. `;
    userMessage += `Her prompt sonuna "--ar ${aspectRatio} --v 6 --no direct gaze, eye contact, looking at camera, posed portrait, passport photo, artificial smile" ekle.`;
  }

  userMessage += `\n\n⚠️ REMINDER: ALL subjects must be caught in natural action — NO passport-style portraits, NO direct eye contact with lens, NO frozen smile, NO posed symmetry.`;

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
6. Faces can be visible for natural interaction, but NEVER introduce direct eye contact with the lens or stiff passport-style portraits.`;

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
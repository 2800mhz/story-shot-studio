/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  STORY SHOT STUDIO — UNIVERSAL PROMPT ENGINE  v3.0                     ║
 * ║  Refactored for global, era-agnostic, format-agnostic production        ║
 * ║  Compatible: Flow AI / Midjourney / Runway / Kling / Stable Diffusion  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Design principles:
 *   • One universal grammar, three production contexts (Documentary / Commercial / Narrative)
 *   • No geographic or cultural defaults — era and region are ALWAYS read from metadata
 *   • Cinematography rules derived from Sight & Sound canon, not genre templates
 *   • Character anchoring is numerical and architectural, never impressionistic
 *   • Every prompt designed for animation: parallax, Ken Burns, push/pull, drift
 */

import type {
  SceneCard,
  Character,
  Location,
  TimeContext,
  PromptCard,
  PromptAnalysis,
  GenerationResult,
  SceneAnalysis,
  SceneReference,
  NarrativeLayer,
  ProjectType,
  RenderMode,
} from '@/types';
import { aiProvider } from './aiProvider';

// ─────────────────────────────────────────────────────────────────────────────
// § 1  UNIVERSAL CINEMATIC GRAMMAR
//      This block is injected into EVERY system prompt regardless of mode.
//      It encodes the invariant laws of frame composition, light, and motion.
// ─────────────────────────────────────────────────────────────────────────────

const UNIVERSAL_CINEMATIC_GRAMMAR = `
╔══════════════════════════════════════════════════════╗
║  UNIVERSAL CINEMATIC GRAMMAR — READ BEFORE WRITING  ║
╚══════════════════════════════════════════════════════╝

These rules apply to every prompt, every shot type, every culture, every era.
No exception. No "close enough."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
I. THE THREE-PLANE DEPTH LAW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every image must contain three depth planes. No exceptions.

  PLANE 1 — FOREGROUND (nearest, often soft focus):
    A physical object partially in frame, creating the illusion of world
    beyond the rectangle. Examples: the edge of a column, a branch,
    a rope, the back of someone's shoulder, a candle flame, a doorframe.
    This plane "locks" the viewer inside the scene.

  PLANE 2 — MIDGROUND (subject zone, sharpest):
    The primary subject or key action. MUST be placed off-centre
    (left third or right third). Never at exact geometric centre.

  PLANE 3 — BACKGROUND (deepest, atmospheric):
    Deep space: sky, mountains, open water, architectural recession,
    crowd-as-texture, fog layer. Gives the image its sense of world scale.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
II. FIGURE / GROUND SEPARATION (MANDATORY IN EVERY SHOT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The subject MUST separate tonally or chromatically from the background.
Choose ONE separation strategy per shot:

  ✦ TONAL:    dark subject against bright ground — or bright against dark
  ✦ RIM LIGHT: backlit subject, edge glow separating silhouette from ground
  ✦ COLOUR:   warm subject against cool background — or inverse
  ✦ FOCUS:    sharp subject against soft/blurred background (depth of field)

FORBIDDEN: mid-tone subject on mid-tone background. This is the death of image.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
III. SUBJECT PLACEMENT — THE OFF-CENTRE MANDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER place the primary subject at the exact centre of the frame.

Use the thirds grid:
  • LEFT THIRD:  subject on left, negative space on right (looks left or ahead)
  • RIGHT THIRD: subject on right, negative space on left (looks right or ahead)
  • UPPER THIRD: subject high, ground fills lower 2/3 (dominance, scale)
  • LOWER THIRD: subject low, sky or ceiling fills upper 2/3 (vulnerability)

Across the 3 shots of one scene, the subject must occupy THREE DIFFERENT
thirds positions. No two shots of the same scene share the same framing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IV. CAMERA HEIGHT AS MEANING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  LOW ANGLE (camera below eye level, looking up):
    → Power, authority, threat, magnitude. Use for leaders, oppressors, monuments.

  EYE LEVEL (camera at subject's eye height):
    → Equality, neutrality, documentary intimacy. The camera neither judges nor elevates.

  HIGH ANGLE (camera above, looking down):
    → Vulnerability, insignificance, surveillance, exposure.

  EXTREME HIGH / BIRD'S EYE:
    → Abstract, godlike, pattern-revealing. Good for crowds, geography, ritual.

  DUTCH / CANTED (frame tilted):
    → Psychological unease, wrong-ness, moral ambiguity, instability.

Specify camera height in EVERY prompt. State the story reason.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
V. LIGHT ANGLE — THE SEVEN POSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Choose ONE per shot. State it explicitly. State the implied source.

  1. LOW RAKE (5–20° above horizon):
     Grazes surfaces, reveals texture aggressively. Dawn / dusk / candle.
     Creates long horizontal cast shadows.

  2. 45° DIAGONAL (upper left or upper right):
     Classic chiaroscuro. Defines face geometry. The "Rembrandt" position.

  3. BACKLIGHT / RIM:
     Light source behind subject. Creates halo, separates silhouette.
     Face in relative shadow. High drama, spiritual associations.

  4. OVERHEAD / ZENITHAL (90° from above):
     Harsh noon. Deep under-eye shadows. Oppressive, exposed, divine judgment.

  5. BELOW / UPLIGHTING:
     Candle, fire, monitor, floor glow. Reverses facial shadow logic.
     Intimate, uncanny, conspiratorial.

  6. SIDE / SPLIT:
     Light from hard 90° left or right. Literally splits face into lit/shadow halves.
     Duality, conflict, secrets.

  7. FRONTAL / FILL-HEAVY:
     Soft, even. Commercial beauty default. In documentary: dishonest, sanitised.
     Use ONLY for commercial mode when beauty is required.

For every light position: state the ATTACHED SHADOW (falling on the subject's body)
and the CAST SHADOW (thrown by the subject onto the environment).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VI. SCREEN DIRECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every shot has a screen direction. Specify it.

  LEFT-TO-RIGHT:  forward movement, progress, positive momentum
  RIGHT-TO-LEFT:  return, resistance, weight, against the current
  TOWARD CAMERA:  power, confrontation, arrival, intimacy
  AWAY FROM CAMERA: departure, loneliness, submission, mystery

This direction must be maintained across cut points unless a deliberate
reversal is intended (disorientation, revelation).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VII. SHOT VARIETY LAW — 3 SHOTS MUST DIFFER IN ≥3 DIMENSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For any three-shot sequence (Wide / Medium / Close-up), the shots MUST differ
in at least three of these six dimensions:

  □  Subject position in frame (which third)
  □  Camera height (low / eye / high / extreme)
  □  Light angle (from the seven positions)
  □  Foreground element (present or absent, and what it is)
  □  Screen direction (left/right/toward/away)
  □  Figure/ground strategy (tonal / rim / colour / focus)

If you cannot tick three differences, redesign the sequence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIII. ANIMATION DESIGN LAW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every image will be animated by Flow AI, Kling, or Runway.
Design for motion in every composition.

ANIMATION-FRIENDLY REQUIREMENTS:
  ✦ ONE clear subject with breathing room around it (room to move into)
  ✦ Distinct depth planes: sharp foreground + sharp midground + soft background
  ✦ Subject slightly off-centre (never centred — centred kills parallax)
  ✦ Implied motion: subject "about to move" or "just arrived" — not frozen neutrally
  ✦ Avoid: multiple subjects at identical sharpness (kills parallax)
  ✦ Avoid: extremely busy textures filling 100% of frame
  ✦ Avoid: pure white backgrounds (blow out in motion)
  ✦ Avoid: perfect bilateral symmetry

MOTION TYPES (describe which one applies per shot):
  Parallax pan:     depth layers move at different speeds — wide/establishing
  Ken Burns zoom:   slow push into detail — close-up / emotional payload
  Drift:            subtle lateral or vertical float — medium / action
  Push-in:          camera moves toward subject — revelation, intimacy
  Pull-back:        camera recedes from subject — isolation, scale reveal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IX. ABSOLUTE PROHIBITIONS (every mode, every shot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER include these in any prompt, any mode:
  ✗ Direct eye contact with the camera lens (breaks the fourth wall)
  ✗ Passport / ID photo pose (frontal, symmetric, expressionless)
  ✗ Text, labels, arrows, captions, subtitles, watermarks in the frame
  ✗ Generic "stock photo" lighting (even, frontal, no shadow)
  ✗ Supernatural or physically impossible light (glowing eyes, electric auras)
  ✗ Anachronistic objects, clothing, or technology for the stated era
  ✗ Neon blue / electric cyan visual effects in realistic or documentary mode
  ✗ Frozen artificial smile on any human subject

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CROWD / ARMY CINEMATIC FRAMING PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a scene contains 10+ people, a military formation, or any crowd:
  ✗ NEVER render the full group arranged, visible, and facing camera
  ✓ INSTEAD choose exactly ONE of these cinematic approaches:

  1. FRAGMENT     Show 3-5 figures tightly framed in sharp focus;
                  the rest implied by blur, overlapping silhouettes, shadows.
                  Example: "tight cluster of soldiers, depth-of-field isolates
                  foreground trio, mass of blurred helmets behind"

  2. GROUND ANGLE Low camera almost at ground level: feet, dust, horse hooves,
                  shield rims — bodies implied above frame.
                  Example: "extreme low angle at ground level, hundred boots and
                  horse hooves churning dust, legs disappear into haze above"

  3. HIGH ANGLE   Camera directly above: helmets and spear-tips as a dense ocean,
                  no faces visible, no theatrical spacing between ranks.
                  Example: "straight down bird's-eye, dense sea of helmets and
                  spears, organic packing, no visible faces"

  4. WITNESS SHOT One bystander observing the crowd from outside it —
                  child, elder, animal — crowd visible only as blurred background.
                  Example: "over-the-shoulder of lone child watching from doorway,
                  crowd blurred and chaotic behind, dust in shaft of light"

  5. AFTERMATH    The empty space seconds after the crowd has passed:
                  disturbed dust, trampled ground, abandoned objects, smoke settling.
                  Example: "empty marketplace after army passed, dust still
                  hanging, overturned cart, footprints in the mud, silence"

  6. DETAIL LOCK  One hand, one face, one object — crowd presence implied
                  by off-screen sound, encroaching shadows, vibrating surfaces.
                  Example: "extreme close-up: white-knuckled grip on spear
                  shaft, vibration in frame implies thousands marching nearby"
`;


// ─────────────────────────────────────────────────────────────────────────────
// § 2  ERA DETECTION MATRIX
//      Universal — applies to any civilisation, any geography, any period.
// ─────────────────────────────────────────────────────────────────────────────

const ERA_DETECTION_MATRIX = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERA DETECTION — READ timeContext.era AND APPLY EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The era determines the ENTIRE material world of the image:
light sources, building materials, clothing, tools, and objects.
No anachronism is acceptable under any framing.

PREHISTORIC / ANCIENT (before c.500 CE):
  Materials:  hand-cut stone, mud brick, thatch, bone, hide, raw copper/bronze
  Light:      fire, torch, oil lamp, direct unfiltered sunlight
  Palette:    earth — ochre, terracotta, raw umber, ash grey, charcoal
  No:         glass windows, written text visible, iron tools (pre-Iron Age)

CLASSICAL / LATE ANTIQUITY (c.500 BCE – c.700 CE):
  Materials:  dressed stone, marble, mosaic tile, silk, linen, iron
  Light:      oil lamp (Greek/Roman), fire altar (Persian), open colonnade sun
  Palette:    limestone white, terracotta, Tyrian purple accent, verdigris green
  No:         pointed arches, paper, sugar, cast iron

MEDIEVAL / EARLY ISLAMIC / EARLY FEUDAL (c.700 – c.1300 CE):
  Materials:  ashlar stone, fired brick, plaster, wool, cotton, manuscript vellum
  Light:      candle, oil lamp, stained glass shafts (European), mashrabiya-filtered sun
  Palette:    muted jewel tones, gilt accent, lapis lazuli, deep crimson, stone grey
  No:         gunpowder weaponry, printed books, plate glass

LATE MEDIEVAL / EARLY MODERN (c.1300 – c.1700 CE):
  Materials:  fired brick, tile, early cast iron, printed paper, woven wool/silk
  Light:      candles, early lanterns, window glass (Europe), open lattice (Asia)
  Palette:    warm amber interior, cold blue exterior, tobacco brown textiles
  No:         electricity, photography, industrial metals, machine-made cloth

INDUSTRIAL / COLONIAL MODERN (c.1700 – c.1920):
  Materials:  steel, cast iron, plate glass, coal, cotton mill cloth, newsprint
  Light:      gas lamp, early electric incandescent, steam exhaust, factory glow
  Palette:    soot grey, sepia, ox-blood red, industrial green, pale sky
  No:         neon, synthetic fabric, digital screens, automobiles (before 1885)

20th CENTURY (c.1920 – c.1980):
  Materials:  concrete, aluminium, bakelite, vinyl, offset-printed media
  Light:      incandescent bulb, neon tube, cinema projector, television glow
  Palette:    muted mid-century colour, film-grain warmth, institutional green
  No:         smartphones, LED screens, internet-age signage

CONTEMPORARY (c.1980 – present):
  Materials:  glass curtain wall, carbon fibre, injection-moulded plastic, LCD/OLED
  Light:      LED, halogen, phone/screen glow, energy-saving fluorescent
  Palette:    full modern saturation OR deliberate cinematic desaturation
  No:         anachronistic restriction lifted — full material world available

TIMELESS / UNSPECIFIED:
  Choose ONE temporal anchor (ancient OR contemporary). NEVER mix both in a frame.
  Anchor to the EMOTIONAL content: grief calls for materials of weight,
  joy calls for materials of light. No anachronisms within the chosen anchor.
`;

// ─────────────────────────────────────────────────────────────────────────────
// § 3  CHARACTER ANCHOR PROTOCOL
//      Numerical, architectural, not impressionistic.
//      Works for any culture, any era.
// ─────────────────────────────────────────────────────────────────────────────

const CHARACTER_ANCHOR_PROTOCOL = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHARACTER ANCHOR PROTOCOL — STRICT CONSISTENCY ACROSS ALL SHOTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI image models have no memory between images. Every prompt featuring
a specific character must contain their COMPLETE PHYSICAL ANCHOR —
reproduced verbatim, not paraphrased.

"Long beard" ≠ "10-12cm beard"  — the model reads different descriptions
as different people. Use the EXACT WORDS AND MEASUREMENTS every time.

ANCHOR FIELDS (in this order, in every character prompt):

  BODY ARCHITECTURE (most-ignored, critical for consistency):
    Weight estimate: "stocky, approximately 90-100kg"
    Height:          "tall, approximately 185cm"
    Shoulder width:  "broad shoulders" or "narrow sloping shoulders"
    Posture:         "slightly forward-hunched" or "rigidly upright"
    Abdomen:         "slight belly" or "lean torso" — pick one, never both

  FACIAL GEOMETRY (measurable, not impressionistic):
    Bone structure:  "wide zygomatic arches" or "narrow facial structure"
    Nose:            "low-bridge hooked nose, wide nostrils" (architectural)
    Eyes:            "deep-set, almond-shaped, under heavy brow ridge"
    Skin:            "weathered, dark olive, deep nasolabial folds, crow's-feet"
    Jaw:             "square" or "tapered" — one, not both

  HAIR AND BEARD (numerical length is mandatory):
    Length:          "full beard extending 8-10cm below jaw" — not "long beard"
    Colour:          exact — "dense snow-white, no grey patches" not "white beard"
    Texture:         "coarse, slightly matted at lower edges"

  COSTUME ARCHITECTURE (every garment layer, era-accurate):
    Each garment:    fabric type, colour name, construction detail
    Headwear:        exact description — "wrapped in 4 coils, rising 18cm above crown"
    Footwear:        material, colour, construction (if visible)
    Accessories:     described exactly — not "jewellery" but "copper bangle on left wrist"

  NEGATIVE ANCHOR (what this character is NOT — injected to --no flags):
    White-bearded:   dark beard, brown beard, black beard, clean-shaven, short beard
    Large headwear:  small cap, bare head, hat, hood
    Specific age:    young face (if elder), smooth skin, no wrinkles (if aged)
    Heavy build:     thin figure, slender, lean (if heavyset)

HUMAN PRESENCE RULES:
  ✓ When a scene describes a person acting → show the person acting
  ✓ When a scene describes grief, joy, conflict → show a human body expressing it
  ✓ When a scene describes dialogue → show people in conversation
  ✓ Faces ARE permitted and encouraged for emotional expression
  ✓ Eyes must target something in the scene (another person, an object, the middle distance)
  ✗ Never replace a human moment with symbolic objects to avoid complexity
  ✗ Never show a face making direct contact with the camera lens
  ✗ Never show a subject posed symmetrically facing the camera (passport pose)
`;

// ─────────────────────────────────────────────────────────────────────────────
// § 4  VISUAL STYLE MODES
//      Three modes. Each has distinct visual grammar.
// ─────────────────────────────────────────────────────────────────────────────

const VISUAL_STYLE_MODES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL STYLE ROUTING — READ visualStyle FIELD FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"cinematic"  → Default photorealistic mode. All grammar rules apply in full.
"symbolic"   → Painterly / illustrated mode for metaphor and myth.
"scientific" → Macro photography mode for biological/physical processes.

─── CINEMATIC MODE ───
Photorealistic. Documentary or narrative register depending on project type.
Full application of all universal grammar rules.
Human subjects must appear when the scene calls for them.

─── SYMBOLIC MODE ───
For scenes depicting: cosmic forces, spiritual visions, mythological events,
metaphors made visual, collective memory, impossible physics.

Rules:
  • Painterly, illustrated aesthetic — not photorealistic
  • Reference the visual tradition of the SPECIFIC culture involved:
    — East Asian: ink wash, Song dynasty scroll, lacquer panel
    — Islamic / Central Asian: geometric illumination, manuscript miniature
    — South Asian: Mughal miniature, Rajput painting, Pattachitra
    — European Medieval: illuminated manuscript, icon painting, fresco
    — Pre-Columbian: codex style, stone relief aesthetic
    — Sub-Saharan African: textile pattern, cave painting reduction
    — No generic "fantasy" style. Culture specificity is mandatory.
  • Character physical anchors still apply — but rendered in the painterly mode
  • No glowing eyes, no electric auras, no sci-fi light effects
  • Supernatural events: suggest them through light and composition, not SFX

─── SCIENTIFIC MODE ───
For scenes depicting: biological processes, neurological events, physical
forces, chemistry, ecology, anatomy, cosmology.

Rules:
  • Macro photography aesthetic — organic, warm, tactile
  • NOT: sci-fi holograms, neon networks, electric-blue voids
  • YES: micro-tissue texture, macro lens clarity, clinical amber warmth
  • NO historical characters, costumes, or period architecture
  • Human presence: anonymous, contemporary clothing, seen from behind or as
    isolated body part (hand, eye, cross-section)
  • Suffix: "photorealistic documentary photography, macro lens, warm amber
    studio light, organic texture, Flow AI motion compatible"
`;

// ─────────────────────────────────────────────────────────────────────────────
// § 5  PROMPT WRITING SPECIFICATION
//      Length, structure, language, technical suffix.
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_WRITING_SPEC = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT WRITING SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LENGTH:   100–140 words per prompt. Dense, precise, no filler.
LANGUAGE: English only in prompt text.

STRUCTURE (in this order):
  1. [CHARACTER ANCHOR — verbatim if character present]
  2. [ACTION / SUBJECT BEHAVIOUR — what are they doing right now]
  3. [ENVIRONMENT + ERA-ACCURATE MATERIAL WORLD]
  4. [LIGHT — angle, source, colour temperature, shadow description]
  5. [CAMERA — height, implied lens, screen direction, depth planes]
  6. [ANIMATION POTENTIAL — what motion this image supports]
  7. [TECHNICAL SUFFIX]

TECHNICAL SUFFIX (cinematic / symbolic):
  "--ar [RATIO] --v 6 --no [character negatives], direct gaze, eye contact,
  looking at camera, passport portrait, artificial smile, centered subject,
  symmetric composition, stock photo lighting, flat background, white background,
  text, labels, arrows, captions, watermarks, anachronistic objects"

TECHNICAL SUFFIX (scientific):
  "photorealistic documentary photography, macro lens, warm amber studio
  light, organic texture, Flow AI motion compatible, --ar [RATIO]"

FAILURE MODES — never do these:
  ✗ Paraphrasing a character's numerical anchors ("long beard" ≠ "12cm beard")
  ✗ Every scene defaulting to "old manuscript on wooden table"
  ✗ Every interior defaulting to the same stone-arch archive room
  ✗ Ignoring the era field and defaulting to a medieval European aesthetic
  ✗ Ignoring the timeOfDay field (night scenes must have night light)
  ✗ Replacing every human scene with landscape because faces are hard
  ✗ Generic "dust motes and shaft of light" as default dramatic device
  ✗ Crowd scenes rendered as neat orderly lines (use one of the 6 crowd techniques above)
  ✗ Full army/crowd arranged facing camera (always fragment, angle, witness, or detail)
`;

// ─────────────────────────────────────────────────────────────────────────────
// § 6  PROJECT TYPE CONTEXTS
//      Three distinct production registers, each with unique demands.
// ─────────────────────────────────────────────────────────────────────────────

const DOCUMENTARY_CONTEXT = `
╔══════════════════════════════╗
║  PRODUCTION CONTEXT:         ║
║  DOCUMENTARY / NON-FICTION   ║
╚══════════════════════════════╝

PURPOSE: To create images that feel extracted from reality —
as if a camera crew was present, caught this moment, and kept rolling.

THE DOCUMENTARY REGISTER:
  • Observational, not staged. People caught doing, not performing.
  • The camera is a witness, not a director.
  • Light is found, not designed — but found light can be extraordinary.
  • Imperfection is a feature: slightly asymmetric, not perfectly composed.
  • Emotional truth over visual perfection.

SHOT FUNCTIONS:
  WIDE / ESTABLISHING:
    Question answered: Where are we? What is the scale of this moment?
    Show: full environment, subject placed small within world.
    Animation: parallax pan across environment.

  MEDIUM / ACTION:
    Question answered: Who is doing what? What is the physical reality?
    Show: person in action, gesture, movement, work, conversation.
    Animation: subtle drift or slow zoom toward subject.

  CLOSE-UP / TEXTURE:
    Question answered: What is the most specific, irreducible truth of this moment?
    Show: expressive face catching an emotion, hands in mid-task, material detail.
    Animation: Ken Burns zoom into detail.

LIGHT PHILOSOPHY (documentary):
  Light reveals. It does not flatter. It does not lie.
  A face in hard side-light showing forty years of labour is more truthful
  than a face softly lit to look beautiful.
  Prioritise: low-rake sun, window-shaft, fire, practical source glow.
  Never: softbox beauty light, unmotivated fill, frontal even illumination.

COLOUR (documentary):
  Era-driven. Emotion-modulated.
  Grief: push toward cool grey-blue.
  Joy:   push toward warm amber-gold.
  Tension: desaturate, push contrast.
  Memory: slight warm fade, reduced saturation.
  Never: oversaturated fantasy palette, digital cyan-orange grade (commercial).
`;

const COMMERCIAL_CONTEXT = `
╔══════════════════════════════╗
║  PRODUCTION CONTEXT:         ║
║  COMMERCIAL / ADVERTISING    ║
╚══════════════════════════════╝

PURPOSE: To create images that sell — a feeling, a product, an aspiration.
Every frame is an argument. Every subject is an ambassador.

COMMERCIAL TIERS (read from scene metadata and masterPrompt):

  TIER 1 — PRODUCT HERO:
    The product is protagonist. Humans serve as context.
    Visual ref: precision, controlled light, isolated subject.
    DO: perfect surface, controlled reflection, shallow depth of field.
    DON'T: cluttered backgrounds, candid chaos, grain.

  TIER 2 — LIFESTYLE / TALENT:
    A person experiencing the brand's world. Emotion is the product.
    Visual ref: aspirational environments, confident subjects, natural light controlled.
    DO: warm, flattering light; rim light separation; purposeful wardrobe.
    DON'T: stock-photo generic happiness, vacant gaze, forced grin.

  TIER 3 — EMOTIONAL / BRAND STORY:
    Story-led. Emotional truth, elevated aesthetics.
    Slightly documentary-leaning but always polished.
    DO: real moments rendered beautifully.
    DON'T: raw, uncontrolled, gritty (unless brief specifies).

  TIER 4 — CORPORATE / INSTITUTIONAL:
    Authority, trust, professionalism. Not cold, not stiff.
    DO: confident body language, purposeful action, clean environments.
    DON'T: fake smiles, generic office clichés, flat even light.

COMMERCIAL SHOT FUNCTIONS:
  WIDE / WORLD-BUILDING:    What world does this brand inhabit?
  MEDIUM / MOMENT:          What is the brand benefit, in human form?
  CLOSE-UP / DESIRE:        What do we want the viewer to want?

COMMERCIAL LIGHTING:
  Always controlled, never accidental.
  Talent: soft large-source key + warm fill + mandatory rim light.
  Product: hard directional key, controlled background, edge separation.
  Emotional: mixed natural + motivated practical.
  FORBIDDEN: overhead harsh noon (unflattering), pure flat ambient (no drama).

BRAND CONSISTENCY:
  Read masterPrompt as brand bible. Every element — wardrobe, background,
  light temperature, colour grade direction — must serve the palette.
  If no palette specified: neutral backgrounds, warm skin tones,
  product as colour accent.

TALENT RULES:
  ✓ Polished but not retouched-looking
  ✓ 1/4 turn away from camera axis (camera-aware but not lens-direct)
  ✓ Interacting with product or environment
  ✗ Stock-photo smile, thumbs-up, generic joy
  ✗ Blurry product (product always sharp unless deliberate rack focus)
`;

const NARRATIVE_CONTEXT = `
╔══════════════════════════════╗
║  PRODUCTION CONTEXT:         ║
║  NARRATIVE / SCRIPTED FILM   ║
╚══════════════════════════════╝

PURPOSE: Every frame is a word in a story. The camera has a point of view.
Light is not found — it is placed with intent. Every shadow has a reason.

GENRE REGISTERS (infer from masterPrompt and episodePrompt):

  DRAMA / PRESTIGE:
    Natural or motivated practical light. Emotional depth in faces.
    Camera close to characters. Negative space for loneliness or tension.
    Reference: Portrait of a Lady on Fire, Minari, The Remains of the Day.

  THRILLER / CRIME:
    High contrast. Deep shadows. Motivated practicals (neon, streetlamp, screen).
    Wide lenses close to subject = paranoia. Desaturated or monochromatic grade.
    Reference: Fincher, Villeneuve (Prisoners), True Detective S1.

  ACTION / EPIC:
    Dynamic implied motion. Peak-of-action frozen frame. Anamorphic aesthetic.
    Warm skin against epic environment. Wide establishing shots.
    Reference: Children of Men, Mad Max: Fury Road, Apocalypto.

  HORROR / PSYCHOLOGICAL:
    Ambient dread. Strange angles. Things partially visible, half in frame.
    Sickly colour: desaturated, cool, green-yellow.
    Reference: Hereditary, The Witch, Under the Skin.

  COMEDY / LIGHT DRAMA:
    Warm, bright, readable. Faces well-lit. Environments busy with life.
    Reference: Amélie, About Time, Brooklyn.

  PERIOD / HISTORICAL:
    Absolute material era accuracy. Practical light sources only.
    Rich surface detail. Deep colour in textiles and architecture.
    Reference: Barry Lyndon, The Favourite, Gangs of New York.

  SCIENCE FICTION:
    Hard sci-fi: cold, sterile, geometric. Soft sci-fi: atmospheric, organic.
    Reference: Arrival, Blade Runner 2049, Annihilation, Moon.

NARRATIVE SHOT FUNCTIONS:
  WIDE / GEOGRAPHY:
    What is the power dynamic of this physical space?
    Who is large, who is small? What does this place mean to this character?

  MEDIUM / RELATIONSHIP OR ACTION:
    Who is doing what to whom? What is physically at stake?
    The verb of the scene — not the noun.

  CLOSE-UP / INTERIOR:
    What does this character feel that they cannot say?
    The object that carries symbolic weight. The hands that reveal the voice conceals.

NARRATIVE LIGHT LANGUAGE:
  Warm amber / golden:    safety, home, love, memory, belonging
  Cool blue / grey:       threat, grief, isolation, clinical detachment
  Green / yellow-green:   sickness, paranoia, artificial malaise
  Red:                    danger, desire, alarm, passion
  Neutral white:          confrontation, revelation, purgatory, truth
  Firelight / candle:     intimacy, secret, conspiracy, mortality

SHADOW AS CHARACTER:
  Half face in shadow:        divided self, duplicity, secret kept
  Subject's shadow large:     power, threat, presence beyond body
  Stepping into light:        revelation, transformation, arrival
  Stepping into shadow:       retreat, shame, concealment

CHARACTER EMOTION → FRAME LANGUAGE:
  Do NOT describe emotion generically.
  WRONG: "looks sad"
  RIGHT: "jaw set hard, eyes fixed on the door she is not walking through,
          slight tremor at lower lip, one hand flat against the cold wall"
  The body carries the subtext. The camera reads the body.
`;

// ─────────────────────────────────────────────────────────────────────────────
// § 7  RESPONSE FORMAT SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const RESPONSE_FORMAT = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT — JSON only, no markdown, no preamble
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "analysis": {
    "detectedEra": "string — what era was inferred from metadata",
    "visualMode": "cinematic | symbolic | scientific",
    "humanPresence": "visible_candid | silhouette | crowd | none",
    "complexity": "low | medium | high | extreme",
    "difficultyScore": 1–10,
    "productionNotes": ["string", "string"]
  },
  "prompts": [
    {
      "shotType": "Wide Shot | Medium Shot | Close-up",
      "summary": "Verbatim copy of scene visualNote (Turkish)",
      "explanation": "Bu görsel... (1 sentence Turkish — what it shows and why)",
      "prompt": "100–140 word English prompt with technical suffix"
    },
    { ... },
    { ... }
  ],
  "selectedIndex": "0 | 1 | 2 — choose the single best prompt for animation suitability, narrative impact, and production accuracy"
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// § 8  MASTER SYSTEM PROMPT BUILDER
//      Assembles the correct system prompt by project type.
// ─────────────────────────────────────────────────────────────────────────────

function buildRenderModeContext(renderMode: RenderMode): string {
  switch (renderMode) {
    case 'stylized':
      return `
RENDER MODE LOCK: STYLIZED REALISM
- Keep anatomy, lighting logic, and physical space believable.
- Allow stylized texture simplification and stronger design language.
- Do NOT drift into flat illustration, manuscript art, or cartoon abstraction unless explicitly requested in-scene.
`;
    case 'illustration':
      return `
RENDER MODE LOCK: PAINTERLY / ILLUSTRATIVE
- The image may read as an illustration, painted frame, or concept-art style image.
- Keep composition, continuity, and subject readability cinematic.
- Avoid accidental switches back to raw photorealism or into flat vector iconography.
`;
    case 'animation':
      return `
RENDER MODE LOCK: ANIMATED FEATURE FRAME
- The image should feel like a polished frame from a high-end animated film.
- Preserve depth, lighting, and cinematic staging.
- Avoid cheap flat cartoon treatment unless the scene explicitly asks for it.
`;
    default:
      return `
RENDER MODE LOCK: PHOTOREAL CINEMATIC
- Keep the image grounded in physically plausible, camera-readable realism.
- Poetic narration may shape emphasis, but must not cause a medium switch into painting, manuscript art, or illustration unless explicitly requested.
`;
  }
}

function buildSystemPrompt(projectType: ProjectType, renderMode: RenderMode): string {
  const contextBlock = (() => {
    switch (projectType) {
      case 'commercial': return COMMERCIAL_CONTEXT;
      case 'narrative':  return NARRATIVE_CONTEXT;
      default:           return DOCUMENTARY_CONTEXT;
    }
  })();

  return [
    `You are an elite visual prompt engineer for cinematic AI image generation.`,
    `Your prompts are used with Flow AI, Midjourney, Runway, and Kling.`,
    `Every prompt you write must produce an image that could pass as a frame`,
    `from a world-class production in the specified mode.`,
    ``,
    UNIVERSAL_CINEMATIC_GRAMMAR,
    ERA_DETECTION_MATRIX,
    CHARACTER_ANCHOR_PROTOCOL,
    VISUAL_STYLE_MODES,
    buildRenderModeContext(renderMode),
    contextBlock,
    PROMPT_WRITING_SPEC,
    RESPONSE_FORMAT,
  ].join('\n');
}

// Exported for direct access (scene analysis uses documentary prompt):
export const DOCUMENTARY_SYSTEM_PROMPT = buildSystemPrompt('documentary', 'photoreal');
export const COMMERCIAL_SYSTEM_PROMPT  = buildSystemPrompt('commercial', 'photoreal');
export const NARRATIVE_SYSTEM_PROMPT   = buildSystemPrompt('narrative', 'photoreal');

// ─────────────────────────────────────────────────────────────────────────────
// § 9  ASPECT RATIO COMPOSITION GUIDANCE
// ─────────────────────────────────────────────────────────────────────────────

const ASPECT_RATIO_COMPOSITION: Record<string, string> = {
  '16:9': `Landscape cinematic widescreen (16:9). Exploit the full horizontal plane.
    Subject on LEFT or RIGHT THIRD — never centre. Three depth planes mandatory:
    blurred foreground element, sharp midground subject, atmospheric background.
    Horizontal screen direction must be explicit. Long cast shadows read horizontally.
    Ideal animation: parallax pan, lateral drift, slow horizontal push.`,

  '4:3': `Classic 4:3 cinematic format. Slightly more vertical breathing room.
    Subject off-centre — left or right third. Three depth planes required.
    Camera height must vary across the three shots.
    Good for intimate spaces, interior scenes, confrontation.
    Ideal animation: push-in, subtle drift, Ken Burns.`,

  '1:1': `Square 1:1 format. Off-centre subject in one quadrant, not at centre.
    Use foreground framing element to create depth illusion (doorframe, fabric edge,
    foliage, architectural element). Strong figure/ground tonal contrast required.
    Good for portraits, objects, social media delivery.
    Ideal animation: Ken Burns, micro-zoom, subtle sway.`,

  '9:16': `Vertical portrait (9:16). Exploit the vertical z-axis.
    Subject mid-frame but left or right of vertical centreline — never centred.
    Three vertical planes: foreground low + subject mid + sky/ceiling as background.
    Screen direction becomes vertical: up = aspiration, down = weight/gravity.
    Ideal animation: vertical push, upward reveal, parallax vertical drift.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// § 10  SCENE COMPLEXITY ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeSceneComplexity(
  sceneText: string,
  visualNote: string,
  characterCount: number
): Partial<PromptAnalysis> {
  const text = `${sceneText} ${visualNote}`.toLowerCase();

  const hasCrowd = characterCount >= 5
    || /crowd|mass|multitude|thousands|army|horde|congregation|procession|rally|mob|throng/.test(text);

  const hasArchitecture = /palace|castle|mosque|temple|cathedral|basilica|citadel|fortress|tower|bridge|pyramid|monument|ruin|arch|colosseum|ziggurat|minaret|pagoda|shrine/.test(text);

  const hasTransformation = /transform|metamorphos|dissolve|morph|chang|evolv|decay|grow|collaps|crumbl|age|wither|bloom|erupt/.test(text);

  const hasHistoricalFigure = /emperor|king|queen|pharaoh|sultan|tsar|caesar|caliph|khan|shogun|pharaoh|chieftain|warlord|pope|regent|vizier|general|commander/.test(text);

  let difficultyScore = 2;
  if (hasCrowd) difficultyScore += 3;
  if (hasTransformation) difficultyScore += 4;
  if (hasArchitecture) difficultyScore += 2;
  if (hasHistoricalFigure) difficultyScore += 2;
  if (characterCount > 2) difficultyScore += 1;
  difficultyScore = Math.min(difficultyScore, 10);

  const complexity: PromptAnalysis['complexity'] =
    difficultyScore >= 8 ? 'extreme'
    : difficultyScore >= 6 ? 'high'
    : difficultyScore >= 4 ? 'medium'
    : 'low';

  const productionNotes: string[] = [];
  if (hasCrowd)            productionNotes.push('⚠️ Crowd scene: wide shot + silhouette + bird\'s-eye recommended');
  if (hasTransformation)   productionNotes.push('⚠️ Transformation scene: static phase-sequence recommended over single morph');
  if (hasArchitecture)     productionNotes.push('🏛️ Architectural scene: atmospheric haze + scale figure recommended');
  if (hasHistoricalFigure) productionNotes.push('👑 Historical figure: character anchor protocol critical');

  return {
    complexity,
    difficultyScore,
    hasCrowd,
    hasArchitecture,
    hasTransformation,
    hasHistoricalFigure,
    recommendedStyle: hasHistoricalFigure || hasTransformation ? 'illustrated' : 'cinematic photorealistic',
    productionNotes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// § 11  USER MESSAGE BUILDER
//       Constructs the complete per-scene instruction block.
// ─────────────────────────────────────────────────────────────────────────────

function buildUserMessage(
  scene: SceneCard,
  characters: Character[],
  locations: Location[],
  masterPrompt: string,
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16',
  renderMode: RenderMode,
  timeContexts?: TimeContext[],
  episodePrompt?: string,
  references?: SceneReference[],
  sceneAnalysis?: SceneAnalysis,
): string {
  const parts: string[] = [];

  // ── Scene Setting Block ────────────────────────────────────────────────────
  if (timeContexts && timeContexts.length > 0) {
    parts.push(`╔══════════════════════════════════════╗`);
    parts.push(`║  SCENE SETTING — READ THIS FIRST     ║`);
    parts.push(`╚══════════════════════════════════════╝`);
    parts.push(`⚠️ The following fields define the MATERIAL WORLD of this scene.`);
    parts.push(`Every object, light source, garment, and surface must belong to this world.`);
    parts.push(``);

    timeContexts.forEach(tc => {
      parts.push(`ERA / PERIOD:    ${tc.era ?? 'unspecified'}`);
      parts.push(`LABEL:          ${tc.label}`);
      if (tc.timeOfDay)      parts.push(`TIME OF DAY:    ${tc.timeOfDay} — THIS IS THE MANDATORY LIGHTING CONDITION`);
      if (tc.lighting)       parts.push(`LIGHTING NOTES: ${sanitizeLighting(tc.lighting)}`);
      if (tc.historicalNotes) parts.push(`HISTORICAL CONTEXT: ${tc.historicalNotes}`);
      if (tc.season)         parts.push(`SEASON:         ${tc.season}`);
      if (tc.weather)        parts.push(`WEATHER:        ${tc.weather}`);
    });

    parts.push(`⚠️ DO NOT override the era, time of day, or historical context with any default.`);
    parts.push(``);
  }

  // ── Character Block ────────────────────────────────────────────────────────
  const layer: NarrativeLayer = scene.narrativeLayer ?? 'historical';
  const isScientific = layer === 'scientific' || scene.visualStyle === 'scientific';

  if (isScientific) {
    parts.push(`╔══════════════════════════════════════╗`);
    parts.push(`║  SCIENTIFIC MODE OVERRIDE            ║`);
    parts.push(`╚══════════════════════════════════════╝`);
    parts.push(`This scene depicts a biological, neurological, or physical process.`);
    parts.push(`DO NOT render historical characters, period costumes, or ancient architecture.`);
    parts.push(`RENDER INSTEAD: macro photography of organic matter, scientific laboratory`);
    parts.push(`environment, anonymous contemporary subjects seen from behind or as body parts.`);
    parts.push(`Suffix: photorealistic documentary photography, macro lens, warm amber studio light.`);
    parts.push(``);
  } else {
    const individualChars = characters.filter(c => !c.isCrowd);
    const crowdChars = characters.filter(c => c.isCrowd);

    if (individualChars.length > 0) {
      parts.push(`╔══════════════════════════════════════╗`);
      parts.push(`║  CHARACTER ANCHORS — EMBED VERBATIM  ║`);
      parts.push(`╚══════════════════════════════════════╝`);
      parts.push(`⚠️ MANDATORY: Copy all numerical measurements EXACTLY.`);
      parts.push(`"10-12cm beard" must appear as "10-12cm beard" — NOT "long beard".`);
      parts.push(``);

      individualChars.forEach((char, idx) => {
        const position = idx === 0 ? 'PRIMARY' : idx === 1 ? 'SECONDARY' : 'TERTIARY';
        parts.push(`[${position} CHARACTER] ${char.name}${char.role ? ` — ${char.role}` : ''}`);
        if (char.age)             parts.push(`  Body age:        ${char.age}`);
        if (char.ethnicity)       parts.push(`  Phenotype:       ${char.ethnicity}`);
        if (char.physicalFeatures) parts.push(`  Face geometry:   ${char.physicalFeatures}`);
        if (char.hair)            parts.push(`  Hair:            ${char.hair}`);
        if (char.beard)           parts.push(`  Beard:           ${char.beard}`);
        if (char.clothing)        parts.push(`  Costume:         ${char.clothing}`);
        if (char.visualDescription) parts.push(`  Full anchor:     ${char.visualDescription}`);
        parts.push(`  ⚠️ Eyes must face OFF-LENS — at another person, an object, or the distance.`);
        parts.push(``);
      });
    }

    if (crowdChars.length > 0) {
      parts.push(`[CROWD PRESENCE]`);
      parts.push(`Crowds: use backlit silhouettes, bird's-eye view, or seen-from-behind.`);
      parts.push(`No individual faces in crowd shots.`);
      crowdChars.forEach(c => {
        if (c.visualDescription) parts.push(`  Crowd type: ${c.visualDescription}`);
      });
      parts.push(``);
    }
  }

  // ── Location Block ─────────────────────────────────────────────────────────
  if (locations.length > 0 && !isScientific) {
    parts.push(`╔══════════════════════════════════════╗`);
    parts.push(`║  LOCATION ARCHITECTURE — EMBED VERBATIM ║`);
    parts.push(`╚══════════════════════════════════════╝`);
    parts.push(`⚠️ These are the PERMANENT architectural features of each location.`);
    parts.push(`The CURRENT CONDITION (damage, siege, festive, desolate) comes from`);
    parts.push(`the Scene Setting block above — use that for atmosphere.`);
    parts.push(``);

    locations.forEach((loc, idx) => {
      const role = idx === 0 ? 'PRIMARY LOCATION' : 'SECONDARY LOCATION';
      parts.push(`[${role}] ${loc.name}`);
      if (loc.visualDescription) parts.push(`  ${loc.visualDescription}`);
      parts.push(``);
    });
  }

  // ── Scene Text & Visual Note ────────────────────────────────────────────────
  parts.push(`╔══════════════════════════════════════╗`);
  parts.push(`║  SCENE CONTENT                       ║`);
  parts.push(`╚══════════════════════════════════════╝`);
  parts.push(`SCENE TEXT:`);
  parts.push(scene.text);
  parts.push(``);
  parts.push(`VISUAL NOTE (Turkish — preserve this spirit in all three shots):`);
  parts.push(`"${scene.visualNote}"`);
  parts.push(``);

  // ── Visual Style Routing ───────────────────────────────────────────────────
  if (isScientific) {
    parts.push(`VISUAL STYLE: scientific — macro photography mode`);
  } else if (scene.visualStyle === 'symbolic') {
    const symbolicByMode: Record<RenderMode, string> = {
      photoreal: 'VISUAL STYLE: symbolic composition with photoreal cinematic rendering',
      stylized: 'VISUAL STYLE: symbolic composition with stylized realism rendering',
      illustration: 'VISUAL STYLE: symbolic composition with painterly illustration rendering',
      animation: 'VISUAL STYLE: symbolic composition with animated feature rendering',
    };
    parts.push(symbolicByMode[renderMode]);
  } else if (scene.visualStyle === 'abstract' || layer === 'universal') {
    const abstractByMode: Record<RenderMode, string> = {
      photoreal: 'VISUAL STYLE: timeless/universal anchor with photoreal cinematic rendering. Choose ONE era (ancient OR contemporary).',
      stylized: 'VISUAL STYLE: timeless/universal anchor with stylized realism rendering. Choose ONE era (ancient OR contemporary).',
      illustration: 'VISUAL STYLE: timeless/universal anchor with painterly illustrative rendering. Choose ONE era (ancient OR contemporary).',
      animation: 'VISUAL STYLE: timeless/universal anchor with animated feature rendering. Choose ONE era (ancient OR contemporary).',
    };
    parts.push(abstractByMode[renderMode]);
  } else {
    const defaultByMode: Record<RenderMode, string> = {
      photoreal: 'VISUAL STYLE: cinematic — photorealistic rendering mode',
      stylized: 'VISUAL STYLE: cinematic — stylized realism rendering mode',
      illustration: 'VISUAL STYLE: cinematic — painterly illustration rendering mode',
      animation: 'VISUAL STYLE: cinematic — animated feature rendering mode',
    };
    parts.push(defaultByMode[renderMode]);
  }
  parts.push(`RENDER MODE: ${renderMode} — keep all prompts in this same medium and visual language.`);
  parts.push(``);

  // ── Timelapse Override ─────────────────────────────────────────────────────
  if (sceneAnalysis?.narrativeType === 'timelapse') {
    const phaseCount = sceneAnalysis.temporalComplexity === 'complex' ? 5
      : sceneAnalysis.temporalComplexity === 'moderate' ? 4 : 3;
    parts.push(`⚠️ TIMELAPSE SCENE: Produce ${phaseCount} temporal phases instead of Wide/Medium/Close-up.`);
    parts.push(`Each prompt must show a DIFFERENT temporal state.`);
    parts.push(`Phase 1 = initial state → Phase ${phaseCount} = final transformed state.`);
    parts.push(``);
  }

  // ── References ─────────────────────────────────────────────────────────────
  const subjectRefs = references?.filter(r => r.referenceType === 'subject') ?? [];
  const styleRefs   = references?.filter(r => r.referenceType === 'style')   ?? [];

  if (subjectRefs.length > 0) {
    parts.push(`SUBJECT REFERENCES:`);
    subjectRefs.forEach(r => parts.push(`  - ${r.description || r.filePath}`));
    parts.push(``);
  }
  if (styleRefs.length > 0) {
    parts.push(`STYLE REFERENCES:`);
    styleRefs.forEach(r => parts.push(`  - ${r.description || r.filePath}`));
    parts.push(``);
  }

  // ── Master / Episode Prompt ────────────────────────────────────────────────
  const effectivePrompt = episodePrompt
    ? `${masterPrompt}\n\nEPISODE VISUAL STYLE OVERRIDE (applied on top of master):\n${episodePrompt}`
    : masterPrompt;

  if (effectivePrompt.trim()) {
    parts.push(`MASTER VISUAL BRIEF (apply to all three shots):`);
    parts.push(effectivePrompt.trim());
    parts.push(``);
  }

  // ── Aspect Ratio Composition Guidance ─────────────────────────────────────
  const compositionGuide = ASPECT_RATIO_COMPOSITION[aspectRatio] ?? ASPECT_RATIO_COMPOSITION['16:9'];
  parts.push(`ASPECT RATIO: ${aspectRatio}`);
  parts.push(`COMPOSITION GUIDANCE: ${compositionGuide.trim()}`);
  parts.push(``);

  // ── Negative Flag Construction ─────────────────────────────────────────────
  const charNegatives: string[] = [];
  characters.filter(c => !c.isCrowd).forEach(char => {
    if (/white|snow|silver/.test((char.beard ?? '').toLowerCase())) {
      charNegatives.push('dark beard', 'brown beard', 'black beard', 'clean-shaven', 'short beard');
    }
    if (/thick|full|dense/.test((char.beard ?? '').toLowerCase())) {
      charNegatives.push('thin beard', 'patchy beard', 'stubble only');
    }
    if (/large|oversized|tall/.test((char.clothing ?? '').toLowerCase())) {
      charNegatives.push('small cap', 'bare head', 'hat', 'hood');
    }
    if (/6[0-9]|7[0-9]|8[0-9]|elder|old|aged/.test((char.age ?? '').toLowerCase())) {
      charNegatives.push('young face', 'smooth skin', 'no wrinkles');
    }
    if (/heavy|stocky|large/.test((char.age ?? '').toLowerCase())) {
      charNegatives.push('thin figure', 'slender build');
    }
  });

  const baseNegatives = [
    'direct gaze', 'eye contact', 'looking at camera',
    'passport portrait', 'id photo pose', 'vesikalık',
    'artificial smile', 'frozen smile', 'thumbs up',
    'symmetric composition', 'centered subject',
    'stage-arranged crowd', 'neat rows of soldiers',
    'stock photo lighting', 'flat frontal lighting',
    'white background', 'solid colour background',
    'text', 'labels', 'arrows', 'captions', 'watermarks',
    'glowing eyes', 'electric aura', 'neon blue light',
    'hologram', 'sci-fi effect', 'anachronistic objects',
  ];

  const allNegatives = [...new Set([...baseNegatives, ...charNegatives])].join(', ');
  const arSuffix     = `--ar ${aspectRatio} --v 6 --no ${allNegatives}`;

  // ── Final Instruction ──────────────────────────────────────────────────────
  const shotInstruction = sceneAnalysis?.narrativeType === 'timelapse'
    ? `Generate temporal phase prompts as specified above. Each phase: 100–140 words English.`
    : `Generate 3 prompts: Wide Shot, Medium Shot, Close-up.
Each prompt 100–140 words English.
The three shots MUST differ in at least 3 of: subject position, camera height,
light angle, foreground element, screen direction, figure/ground strategy.`;

  parts.push(shotInstruction);
  parts.push(``);
  parts.push(`OUTPUT FORMAT — ADVANCED CINEMATIC BLOCK TEMPLATE (MANDATORY):`);
  parts.push(`Write EACH prompt as a single English paragraph that still follows this block order (use short labels):`);
  parts.push(`SHOT INTENT: ... | SUBJECT: ... | ACTION: ... | ENVIRONMENT: ... | STYLE: ... | LIGHT: ... | CAMERA/COMP: ... | CONTINUITY LOCK: ... | MOTION HINT: ... | NEGATIVES: ...`);
  parts.push(`Rules: keep STYLE and CONTENT separated; use concrete physical/material language; avoid empty adjectives (beautiful, cinematic, dramatic).`);
  parts.push(`If something is unknown, omit it — do not invent new entities or anachronistic props.`);
  parts.push(``);
  parts.push(`Append to EVERY prompt: ${arSuffix}`);
  parts.push(``);
  parts.push(`⚠️ FINAL REMINDER: All subjects caught in natural action.`);
  parts.push(`No passport poses. No camera eye contact. No symmetric staging.`);

  return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// § 12  LIGHTING SANITISER
//       Strips physically impossible light descriptions from time context.
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeLighting(raw: string): string {
  return raw
    .replace(/\bblinding\b/gi,              'intense')
    .replace(/\bblinding\s+white[-\s]?gold\b/gi, 'warm gold')
    .replace(/\bsupernatural\s+stillness\b/gi,   'otherworldly stillness')
    .replace(/\bsupernatural\b/gi,          'extraordinary')
    .replace(/\bethereally?\s+white[-\s]?gold\b/gi, 'soft warm gold')
    .replace(/\bcosmically?\s+bright\b/gi,  'softly luminous')
    .replace(/\bcosmically?\b/gi,           'distantly')
    .replace(/\bfrozen\s+light\b/gi,        'still quiet light')
    .replace(/\bglowing\s+eyes\b/gi,        'natural eyes with soft catchlights')
    .replace(/\beyes?.*?glow\b/gi,          'natural eyes with realistic reflections')
    .replace(/\bmystical\s+glow\b/gi,       'soft ambient light')
    .replace(/\bspiritual\s+light\b/gi,     'faint warm radiance')
    .replace(/\bhalo\b/gi,                  'subtle rim light')
    .replace(/\baura\b/gi,                  'gentle illumination')
    .replace(/\bcosmic\b/gi,               'celestial');
}

// ─────────────────────────────────────────────────────────────────────────────
// § 13  JSON RESPONSE PARSER
// ─────────────────────────────────────────────────────────────────────────────

function tryParseJSON(raw: string): unknown {
  if (!raw?.trim()) throw new Error('Empty response');

  // Strip markdown fences
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find first { 
  const brace = cleaned.indexOf('{');
  if (brace < 0) throw new Error('No JSON object found');
  cleaned = cleaned.substring(brace);

  // Find matching close brace
  let depth = 0, inStr = false, esc = false;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc)                { esc = false; continue; }
    if (ch === '\\' && inStr){ esc = true;  continue; }
    if (ch === '"')          { inStr = !inStr; continue; }
    if (inStr)               continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }

  cleaned = end > 0 ? cleaned.substring(0, end + 1) : cleaned;

  // Escape unescaped newlines inside strings
  cleaned = cleaned.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (m) =>
    m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );

  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────────────────────────────
// § 14  MAIN GENERATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

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
  onRetry?: () => void,
  projectType: ProjectType = 'documentary',
  renderMode: RenderMode = 'photoreal',
): Promise<GenerationResult> {

  const systemPrompt = buildSystemPrompt(projectType, renderMode);

  const userMessage = buildUserMessage(
    scene,
    characters,
    locations,
    masterPrompt,
    aspectRatio,
    renderMode,
    timeContexts,
    episodePrompt,
    references,
    sceneAnalysis,
  );

  const arSuffix = `--ar ${aspectRatio} --v 6`;

  // Retry loop — up to 4 attempts
  let parsed: {
    prompts?: Array<{ shotType?: string; summary?: string; explanation?: string; prompt?: string }>;
    analysis?: Partial<PromptAnalysis>;
    selectedIndex?: number;
  } | null = null;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const instruction = attempt === 0
        ? userMessage
        : `${userMessage}\n\nCRITICAL: Return ONLY a valid JSON object. Start with {`;

      const raw = await aiProvider.generateContent(instruction, systemPrompt, {
        operationType: attempt === 0 ? 'prompt_generation' : 'prompt_generation_retry',
      });

      if (!raw?.trim()) {
        console.warn(`[promptEngine] Attempt ${attempt + 1}: empty response`);
        await delay(2000);
        continue;
      }

      const candidate = tryParseJSON(raw) as typeof parsed;

      if (!candidate?.prompts || !Array.isArray(candidate.prompts) || candidate.prompts.length === 0) {
        console.warn(`[promptEngine] Attempt ${attempt + 1}: no prompts array`);
        onRetry?.();
        await delay(1500);
        continue;
      }

      parsed = candidate;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[promptEngine] Attempt ${attempt + 1} failed:`, err);
      onRetry?.();
      await delay(2000 * (attempt + 1));
    }
  }

  if (!parsed?.prompts || !Array.isArray(parsed.prompts)) {
    if (lastError instanceof Error && /JSON|No JSON object found/i.test(lastError.message)) {
      throw new Error('Invalid JSON after 4 attempts');
    }
    throw new Error(`Prompt generation failed after 4 attempts. Last error: ${lastError}`);
  }

  const subjectRefs = references?.filter(r => r.referenceType === 'subject') ?? [];
  const selectedIndex = Number.isInteger(parsed.selectedIndex) && Number(parsed.selectedIndex) >= 0 && Number(parsed.selectedIndex) <= 2
    ? Number(parsed.selectedIndex)
    : 0;

  const prompts: PromptCard[] = parsed.prompts.map((p, idx) => {
    const labels: string[]                       = ['Prompt A', 'Prompt B', 'Prompt C'];
    const types: Array<'wide' | 'medium' | 'closeup'> = ['wide', 'medium', 'closeup'];
    const raw = p.prompt ?? '';
    const promptText = /--ar\s+[\d:]+/.test(raw) ? raw : `${raw} ${arSuffix}`.trim();

    return {
      id: crypto.randomUUID(),
      type: types[idx] ?? 'wide',
      label: labels[idx] ?? `Prompt ${idx + 1}`,
      shotType: p.shotType ?? 'General',
      summary: p.summary ?? scene.visualNote,
      explanation: p.explanation ?? '',
      promptText,
      versions: [promptText],
      aspectRatio,
      generationType,
      hasSubjectReference: subjectRefs.length > 0,
      isPinned: idx === selectedIndex,
      isPinnedByAI: idx === selectedIndex,
    };
  });

  const raw = parsed.analysis ?? {};
  const analysis: PromptAnalysis = {
    complexity:          (raw.complexity as PromptAnalysis['complexity']) ?? DEFAULT_ANALYSIS.complexity,
    difficultyScore:     typeof raw.difficultyScore === 'number' ? raw.difficultyScore : DEFAULT_ANALYSIS.difficultyScore,
    hasCrowd:           typeof raw.hasCrowd === 'boolean'          ? raw.hasCrowd          : DEFAULT_ANALYSIS.hasCrowd,
    hasArchitecture:    typeof raw.hasArchitecture === 'boolean'    ? raw.hasArchitecture    : DEFAULT_ANALYSIS.hasArchitecture,
    hasTransformation:  typeof raw.hasTransformation === 'boolean'  ? raw.hasTransformation  : DEFAULT_ANALYSIS.hasTransformation,
    hasHistoricalFigure: typeof raw.hasHistoricalFigure === 'boolean' ? raw.hasHistoricalFigure : DEFAULT_ANALYSIS.hasHistoricalFigure,
    recommendedStyle:   typeof raw.recommendedStyle === 'string'   ? raw.recommendedStyle   : DEFAULT_ANALYSIS.recommendedStyle,
    productionNotes:    Array.isArray(raw.productionNotes)         ? raw.productionNotes    : DEFAULT_ANALYSIS.productionNotes,
  };

  return { prompts, analysis };
}

// ─────────────────────────────────────────────────────────────────────────────
// § 15  PROMPT REVISION
// ─────────────────────────────────────────────────────────────────────────────

const REVISION_SYSTEM_PROMPT = `You are an expert cinematographer and AI prompt engineer.
Your task is to revise an existing English image generation prompt based on a user instruction
(which may be in Turkish, English, or any language).

RULES:
  1. Preserve the original camera angle, lighting, and core composition.
  2. Seamlessly integrate the user's specific change into the existing scene.
  3. Return ONLY the final revised English prompt. No explanations, no markdown, no quotes.
  4. Keep all technical parameters (--ar, --v, --no flags) intact.
  5. If asked to remove something: remove it cleanly without breaking sentence structure.
  6. Faces may be visible for natural interaction — never introduce direct eye contact with lens.
  7. Do not change the shot type unless explicitly instructed.`;

export async function revisePrompt(
  originalPrompt: string,
  instruction: string,
  _apiKey?: string,
  _model?: string,
  _temperature?: number,
): Promise<string> {
  const userMessage = `ORIGINAL PROMPT:\n${originalPrompt}\n\nUSER INSTRUCTION:\n"${instruction}"\n\nProvide the revised English prompt:`;

  try {
    const raw = await aiProvider.generateContent(userMessage, REVISION_SYSTEM_PROMPT, {
      operationType: 'prompt_revision',
    });

    let cleaned = raw.trim()
      .replace(/^```[a-z]*\n?/, '')
      .replace(/\n?```$/, '');

    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    return cleaned.trim();
  } catch (error) {
    console.error('[promptEngine] Revision failed:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § 16  AUTO-PIN (BEST PROMPT SELECTION)
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}


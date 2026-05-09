/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  STORY SHOT STUDIO â€” UNIVERSAL PROMPT ENGINE  v3.0                     â•‘
 * â•‘  Refactored for global, era-agnostic, format-agnostic production        â•‘
 * â•‘  Compatible: Flow AI / Midjourney / Runway / Kling / Stable Diffusion  â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * Design principles:
 *   â€¢ One universal grammar, three production contexts (Documentary / Commercial / Narrative)
 *   â€¢ No geographic or cultural defaults â€” era and region are ALWAYS read from metadata
 *   â€¢ Cinematography rules derived from Sight & Sound canon, not genre templates
 *   â€¢ Character anchoring is numerical and architectural, never impressionistic
 *   â€¢ Every prompt designed for animation: parallax, Ken Burns, push/pull, drift
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
  CameraAngleSlot,
} from '@/types';
import { aiProvider } from './aiProvider';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 1  UNIVERSAL CINEMATIC GRAMMAR
//      This block is injected into EVERY system prompt regardless of mode.
//      It encodes the invariant laws of frame composition, light, and motion.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const UNIVERSAL_CINEMATIC_GRAMMAR = `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  UNIVERSAL CINEMATIC GRAMMAR â€” READ BEFORE WRITING  â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

These rules apply to every prompt, every shot type, every culture, every era.
No exception. No "close enough."

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
I. THE THREE-PLANE DEPTH LAW
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

Every image must contain three depth planes. No exceptions.

  PLANE 1 â€” FOREGROUND (nearest, often soft focus):
    A physical object partially in frame, creating the illusion of world
    beyond the rectangle. Examples: the edge of a column, a branch,
    a rope, the back of someone's shoulder, a candle flame, a doorframe.
    This plane "locks" the viewer inside the scene.

  PLANE 2 â€” MIDGROUND (subject zone, sharpest):
    The primary subject or key action. MUST be placed off-centre
    (left third or right third). Never at exact geometric centre.

  PLANE 3 â€” BACKGROUND (deepest, atmospheric):
    Deep space: sky, mountains, open water, architectural recession,
    crowd-as-texture, fog layer. Gives the image its sense of world scale.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
II. FIGURE / GROUND SEPARATION (MANDATORY IN EVERY SHOT)
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

The subject MUST separate tonally or chromatically from the background.
Choose ONE separation strategy per shot:

  âœ¦ TONAL:    dark subject against bright ground â€” or bright against dark
  âœ¦ RIM LIGHT: backlit subject, edge glow separating silhouette from ground
  âœ¦ COLOUR:   warm subject against cool background â€” or inverse
  âœ¦ FOCUS:    sharp subject against soft/blurred background (depth of field)

FORBIDDEN: mid-tone subject on mid-tone background. This is the death of image.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
III. SUBJECT PLACEMENT â€” THE OFF-CENTRE MANDATE
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

NEVER place the primary subject at the exact centre of the frame.

Use the thirds grid:
  â€¢ LEFT THIRD:  subject on left, negative space on right (looks left or ahead)
  â€¢ RIGHT THIRD: subject on right, negative space on left (looks right or ahead)
  â€¢ UPPER THIRD: subject high, ground fills lower 2/3 (dominance, scale)
  â€¢ LOWER THIRD: subject low, sky or ceiling fills upper 2/3 (vulnerability)

Across the 3 shots of one scene, the subject must occupy THREE DIFFERENT
thirds positions. No two shots of the same scene share the same framing.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
IV. CAMERA HEIGHT AS MEANING
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

  LOW ANGLE (camera below eye level, looking up):
    â†’ Power, authority, threat, magnitude. Use for leaders, oppressors, monuments.

  EYE LEVEL (camera at subject's eye height):
    â†’ Equality, neutrality, documentary intimacy. The camera neither judges nor elevates.

  HIGH ANGLE (camera above, looking down):
    â†’ Vulnerability, insignificance, surveillance, exposure.

  EXTREME HIGH / BIRD'S EYE:
    â†’ Abstract, godlike, pattern-revealing. Good for crowds, geography, ritual.

  DUTCH / CANTED (frame tilted):
    â†’ Psychological unease, wrong-ness, moral ambiguity, instability.

Specify camera height in EVERY prompt. State the story reason.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
V. LIGHT ANGLE â€” THE SEVEN POSITIONS
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

Choose ONE per shot. State it explicitly. State the implied source.

  1. LOW RAKE (5â€“20Â° above horizon):
     Grazes surfaces, reveals texture aggressively. Dawn / dusk / candle.
     Creates long horizontal cast shadows.

  2. 45Â° DIAGONAL (upper left or upper right):
     Classic chiaroscuro. Defines face geometry. The "Rembrandt" position.

  3. BACKLIGHT / RIM:
     Light source behind subject. Creates halo, separates silhouette.
     Face in relative shadow. High drama, spiritual associations.

  4. OVERHEAD / ZENITHAL (90Â° from above):
     Harsh noon. Deep under-eye shadows. Oppressive, exposed, divine judgment.

  5. BELOW / UPLIGHTING:
     Candle, fire, monitor, floor glow. Reverses facial shadow logic.
     Intimate, uncanny, conspiratorial.

  6. SIDE / SPLIT:
     Light from hard 90Â° left or right. Literally splits face into lit/shadow halves.
     Duality, conflict, secrets.

  7. FRONTAL / FILL-HEAVY:
     Soft, even. Commercial beauty default. In documentary: dishonest, sanitised.
     Use ONLY for commercial mode when beauty is required.

For every light position: state the ATTACHED SHADOW (falling on the subject's body)
and the CAST SHADOW (thrown by the subject onto the environment).

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
VI. SCREEN DIRECTION
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

Every shot has a screen direction. Specify it.

  LEFT-TO-RIGHT:  forward movement, progress, positive momentum
  RIGHT-TO-LEFT:  return, resistance, weight, against the current
  TOWARD CAMERA:  power, confrontation, arrival, intimacy
  AWAY FROM CAMERA: departure, loneliness, submission, mystery

This direction must be maintained across cut points unless a deliberate
reversal is intended (disorientation, revelation).

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
VII. SHOT VARIETY LAW â€” 3 SHOTS MUST DIFFER IN â‰¥3 DIMENSIONS
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

For any three-shot sequence (Wide / Medium / Close-up), the shots MUST differ
in at least three of these six dimensions:

  â–¡  Subject position in frame (which third)
  â–¡  Camera height (low / eye / high / extreme)
  â–¡  Light angle (from the seven positions)
  â–¡  Foreground element (present or absent, and what it is)
  â–¡  Screen direction (left/right/toward/away)
  â–¡  Figure/ground strategy (tonal / rim / colour / focus)

If you cannot tick three differences, redesign the sequence.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
VIII. ANIMATION DESIGN LAW
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

Every image will be animated by Flow AI, Kling, or Runway.
Design for motion in every composition.

ANIMATION-FRIENDLY REQUIREMENTS:
  âœ¦ ONE clear subject with breathing room around it (room to move into)
  âœ¦ Distinct depth planes: sharp foreground + sharp midground + soft background
  âœ¦ Subject slightly off-centre (never centred â€” centred kills parallax)
  âœ¦ Implied motion: subject "about to move" or "just arrived" â€” not frozen neutrally
  âœ¦ Avoid: multiple subjects at identical sharpness (kills parallax)
  âœ¦ Avoid: extremely busy textures filling 100% of frame
  âœ¦ Avoid: pure white backgrounds (blow out in motion)
  âœ¦ Avoid: perfect bilateral symmetry

MOTION TYPES (describe which one applies per shot):
  Parallax pan:     depth layers move at different speeds â€” wide/establishing
  Ken Burns zoom:   slow push into detail â€” close-up / emotional payload
  Drift:            subtle lateral or vertical float â€” medium / action
  Push-in:          camera moves toward subject â€” revelation, intimacy
  Pull-back:        camera recedes from subject â€” isolation, scale reveal

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
IX. ABSOLUTE PROHIBITIONS (every mode, every shot)
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

NEVER include these in any prompt, any mode:
  âœ— Direct eye contact with the camera lens (breaks the fourth wall)
  âœ— Passport / ID photo pose (frontal, symmetric, expressionless)
  âœ— Text, labels, arrows, captions, subtitles, watermarks in the frame
  âœ— Generic "stock photo" lighting (even, frontal, no shadow)
  âœ— Supernatural or physically impossible light (glowing eyes, electric auras)
  âœ— Anachronistic objects, clothing, or technology for the stated era
  âœ— Neon blue / electric cyan visual effects in realistic or documentary mode
  âœ— Frozen artificial smile on any human subject

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
X. OBSERVATIONAL WITNESS MANDATE
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

The camera is a witness, not a director.
Every image must feel as if a camera crew was present and caught this moment by chance.

FORBIDDEN staging patterns:
  âœ— Subject standing still facing camera
  âœ— Subject placed at geometric centre of frame for compositional balance
  âœ— Multiple subjects arranged symmetrically or at equal distances
  âœ— Subject body perfectly perpendicular to camera axis
  âœ— Subject weight evenly distributed on both feet in a neutral stance
  âœ— Any gesture performed for an audience rather than emerging from the scene
  âœ— Any expression that would look the same if no camera were present

MANDATORY "caught" indicators â€” include at least ONE per shot:
  âœ“ Weight mid-transfer: heel raised, foot turning, knee flexed, torso shifting
  âœ“ Interrupted gesture: hand half-raised, mouth half-open, fingers still in motion
  âœ“ Body axis 15â€“30Â° off camera axis
  âœ“ Eyes engaged with something inside the scene: another person, an object, the ground, the horizon
  âœ“ At least one body part partially out of frame: shoulder edge, hand cut, foot cropped
  âœ“ Evidence of continuous action: sweat, dust, displaced clothing, mid-stride posture
  âœ“ For conversations: one person mid-word, the other mid-listen â€” never both static

THE DECISIVE MOMENT RULE:
Write the prompt for one fraction of a second before or after the peak action.
Not "he strikes" â€” "arm at maximum backswing, knuckles white, torso already rotating."
Not "she prays" â€” "forehead just touching the ground, fingers not yet fully flat."
Not "they fight" â€” "distance between blades 8cm, both eyes locked before impact."

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
CROWD / ARMY CINEMATIC FRAMING PROTOCOL
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

When a scene contains 10+ people, a military formation, or any crowd:
  âœ— NEVER render the full group arranged, visible, and facing camera
  âœ“ INSTEAD choose exactly ONE of these cinematic approaches:

  1. FRAGMENT     Show 3-5 figures tightly framed in sharp focus;
                  the rest implied by blur, overlapping silhouettes, shadows.
                  Example: "tight cluster of soldiers, depth-of-field isolates
                  foreground trio, mass of blurred helmets behind"

  2. GROUND ANGLE Low camera almost at ground level: feet, dust, horse hooves,
                  shield rims â€” bodies implied above frame.
                  Example: "extreme low angle at ground level, hundred boots and
                  horse hooves churning dust, legs disappear into haze above"

  3. HIGH ANGLE   Camera directly above: helmets and spear-tips as a dense ocean,
                  no faces visible, no theatrical spacing between ranks.
                  Example: "straight down bird's-eye, dense sea of helmets and
                  spears, organic packing, no visible faces"

  4. WITNESS SHOT One bystander observing the crowd from outside it â€”
                  child, elder, animal â€” crowd visible only as blurred background.
                  Example: "over-the-shoulder of lone child watching from doorway,
                  crowd blurred and chaotic behind, dust in shaft of light"

  5. AFTERMATH    The empty space seconds after the crowd has passed:
                  disturbed dust, trampled ground, abandoned objects, smoke settling.
                  Example: "empty marketplace after army passed, dust still
                  hanging, overturned cart, footprints in the mud, silence"

  6. DETAIL LOCK  One hand, one face, one object â€” crowd presence implied
                  by off-screen sound, encroaching shadows, vibrating surfaces.
                  Example: "extreme close-up: white-knuckled grip on spear
                  shaft, vibration in frame implies thousands marching nearby"
`;


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 2  ERA DETECTION MATRIX
//      Universal â€” applies to any civilisation, any geography, any period.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ERA_DETECTION_MATRIX = `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ERA DETECTION â€” READ timeContext.era AND APPLY EXACTLY
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

The era determines the ENTIRE material world of the image:
light sources, building materials, clothing, tools, and objects.
No anachronism is acceptable under any framing.

PREHISTORIC / ANCIENT (before c.500 CE):
  Materials:  hand-cut stone, mud brick, thatch, bone, hide, raw copper/bronze
  Light:      fire, torch, oil lamp, direct unfiltered sunlight
  Palette:    earth â€” ochre, terracotta, raw umber, ash grey, charcoal
  No:         glass windows, written text visible, iron tools (pre-Iron Age)

CLASSICAL / LATE ANTIQUITY (c.500 BCE â€“ c.700 CE):
  Materials:  dressed stone, marble, mosaic tile, silk, linen, iron
  Light:      oil lamp (Greek/Roman), fire altar (Persian), open colonnade sun
  Palette:    limestone white, terracotta, Tyrian purple accent, verdigris green
  No:         pointed arches, paper, sugar, cast iron

MEDIEVAL / EARLY ISLAMIC / EARLY FEUDAL (c.700 â€“ c.1300 CE):
  Materials:  ashlar stone, fired brick, plaster, wool, cotton, manuscript vellum
  Light:      candle, oil lamp, stained glass shafts (European), mashrabiya-filtered sun
  Palette:    muted jewel tones, gilt accent, lapis lazuli, deep crimson, stone grey
  No:         gunpowder weaponry, printed books, plate glass

LATE MEDIEVAL / EARLY MODERN (c.1300 â€“ c.1700 CE):
  Materials:  fired brick, tile, early cast iron, printed paper, woven wool/silk
  Light:      candles, early lanterns, window glass (Europe), open lattice (Asia)
  Palette:    warm amber interior, cold blue exterior, tobacco brown textiles
  No:         electricity, photography, industrial metals, machine-made cloth

INDUSTRIAL / COLONIAL MODERN (c.1700 â€“ c.1920):
  Materials:  steel, cast iron, plate glass, coal, cotton mill cloth, newsprint
  Light:      gas lamp, early electric incandescent, steam exhaust, factory glow
  Palette:    soot grey, sepia, ox-blood red, industrial green, pale sky
  No:         neon, synthetic fabric, digital screens, automobiles (before 1885)

20th CENTURY (c.1920 â€“ c.1980):
  Materials:  concrete, aluminium, bakelite, vinyl, offset-printed media
  Light:      incandescent bulb, neon tube, cinema projector, television glow
  Palette:    muted mid-century colour, film-grain warmth, institutional green
  No:         smartphones, LED screens, internet-age signage

CONTEMPORARY (c.1980 â€“ present):
  Materials:  glass curtain wall, carbon fibre, injection-moulded plastic, LCD/OLED
  Light:      LED, halogen, phone/screen glow, energy-saving fluorescent
  Palette:    full modern saturation OR deliberate cinematic desaturation
  No:         anachronistic restriction lifted â€” full material world available

TIMELESS / UNSPECIFIED:
  Choose ONE temporal anchor (ancient OR contemporary). NEVER mix both in a frame.
  Anchor to the EMOTIONAL content: grief calls for materials of weight,
  joy calls for materials of light. No anachronisms within the chosen anchor.
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 3  CHARACTER ANCHOR PROTOCOL
//      Numerical, architectural, not impressionistic.
//      Works for any culture, any era.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CHARACTER_ANCHOR_PROTOCOL = `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
CHARACTER ANCHOR PROTOCOL â€” STRICT CONSISTENCY ACROSS ALL SHOTS
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

AI image models have no memory between images. Every prompt featuring
a specific character must contain their COMPLETE PHYSICAL ANCHOR â€”
reproduced verbatim, not paraphrased.

"Long beard" â‰  "10-12cm beard"  â€” the model reads different descriptions
as different people. Use the EXACT WORDS AND MEASUREMENTS every time.

ANCHOR FIELDS (in this order, in every character prompt):

  BODY ARCHITECTURE (most-ignored, critical for consistency):
    Weight estimate: "stocky, approximately 90-100kg"
    Height:          "tall, approximately 185cm"
    Shoulder width:  "broad shoulders" or "narrow sloping shoulders"
    Posture:         "slightly forward-hunched" or "rigidly upright"
    Abdomen:         "slight belly" or "lean torso" â€” pick one, never both

  FACIAL GEOMETRY (measurable, not impressionistic):
    Bone structure:  "wide zygomatic arches" or "narrow facial structure"
    Nose:            "low-bridge hooked nose, wide nostrils" (architectural)
    Eyes:            "deep-set, almond-shaped, under heavy brow ridge"
    Skin:            "weathered, dark olive, deep nasolabial folds, crow's-feet"
    Jaw:             "square" or "tapered" â€” one, not both

  HAIR AND BEARD (numerical length is mandatory):
    Length:          "full beard extending 8-10cm below jaw" â€” not "long beard"
    Colour:          exact â€” "dense snow-white, no grey patches" not "white beard"
    Texture:         "coarse, slightly matted at lower edges"

  COSTUME ARCHITECTURE (every garment layer, era-accurate):
    Each garment:    fabric type, colour name, construction detail
    Headwear:        exact description â€” "wrapped in 4 coils, rising 18cm above crown"
    Footwear:        material, colour, construction (if visible)
    Accessories:     described exactly â€” not "jewellery" but "copper bangle on left wrist"

  NEGATIVE ANCHOR (what this character is NOT â€” injected to --no flags):
    White-bearded:   dark beard, brown beard, black beard, clean-shaven, short beard
    Large headwear:  small cap, bare head, hat, hood
    Specific age:    young face (if elder), smooth skin, no wrinkles (if aged)
    Heavy build:     thin figure, slender, lean (if heavyset)

HUMAN PRESENCE RULES:
  âœ“ When a scene describes a person acting â†’ show the person acting
  âœ“ When a scene describes grief, joy, conflict â†’ show a human body expressing it
  âœ“ When a scene describes dialogue â†’ show people in conversation
  âœ“ Faces ARE permitted and encouraged for emotional expression
  âœ“ Eyes must target something in the scene (another person, an object, the middle distance)
  âœ— Never replace a human moment with symbolic objects to avoid complexity
  âœ— Never show a face making direct contact with the camera lens
  âœ— Never show a subject posed symmetrically facing the camera (passport pose)
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 4  VISUAL STYLE MODES
//      Three modes. Each has distinct visual grammar.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VISUAL_STYLE_MODES = `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
VISUAL STYLE ROUTING â€” READ visualStyle FIELD FIRST
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

"cinematic"  â†’ Default photorealistic mode. All grammar rules apply in full.
"symbolic"   â†’ Painterly / illustrated mode for metaphor and myth.
"scientific" â†’ Macro photography mode for biological/physical processes.

â”€â”€â”€ CINEMATIC MODE â”€â”€â”€
Photorealistic. Documentary or narrative register depending on project type.
Full application of all universal grammar rules.
Human subjects must appear when the scene calls for them.

â”€â”€â”€ SYMBOLIC MODE â”€â”€â”€
For scenes depicting: cosmic forces, spiritual visions, mythological events,
metaphors made visual, collective memory, impossible physics.

Rules:
  â€¢ Painterly, illustrated aesthetic â€” not photorealistic
  â€¢ Reference the visual tradition of the SPECIFIC culture involved:
    â€” East Asian: ink wash, Song dynasty scroll, lacquer panel
    â€” Islamic / Central Asian: geometric illumination, manuscript miniature
    â€” South Asian: Mughal miniature, Rajput painting, Pattachitra
    â€” European Medieval: illuminated manuscript, icon painting, fresco
    â€” Pre-Columbian: codex style, stone relief aesthetic
    â€” Sub-Saharan African: textile pattern, cave painting reduction
    â€” No generic "fantasy" style. Culture specificity is mandatory.
  â€¢ Character physical anchors still apply â€” but rendered in the painterly mode
  â€¢ No glowing eyes, no electric auras, no sci-fi light effects
  â€¢ Supernatural events: suggest them through light and composition, not SFX

â”€â”€â”€ SCIENTIFIC MODE â”€â”€â”€
For scenes depicting: biological processes, neurological events, physical
forces, chemistry, ecology, anatomy, cosmology.

Rules:
  â€¢ Macro photography aesthetic â€” organic, warm, tactile
  â€¢ NOT: sci-fi holograms, neon networks, electric-blue voids
  â€¢ YES: micro-tissue texture, macro lens clarity, clinical amber warmth
  â€¢ NO historical characters, costumes, or period architecture
  â€¢ Human presence: anonymous, contemporary clothing, seen from behind or as
    isolated body part (hand, eye, cross-section)
  â€¢ Suffix: "photorealistic documentary photography, macro lens, warm amber
    studio light, organic texture, Flow AI motion compatible"
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 5  PROMPT WRITING SPECIFICATION
//      Length, structure, language, technical suffix.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PROMPT_WRITING_SPEC = `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
PROMPT WRITING SPECIFICATION
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

LENGTH:   100â€“140 words per prompt. Dense, precise, no filler.
LANGUAGE: English only in prompt text.

STRUCTURE (in this order):
  1. [CHARACTER ANCHOR â€” verbatim if character present]
  2. [ACTION / SUBJECT BEHAVIOUR â€” what are they doing right now]
  3. [ENVIRONMENT + ERA-ACCURATE MATERIAL WORLD]
  4. [LIGHT â€” angle, source, colour temperature, shadow description]
  5. [CAMERA â€” height, implied lens, screen direction, depth planes]
  6. [ANIMATION POTENTIAL â€” what motion this image supports]
  7. [TECHNICAL SUFFIX]

TECHNICAL SUFFIX (cinematic / symbolic):
  "--ar [RATIO] --v 6 --no [character negatives], direct gaze, eye contact,
  looking at camera, passport portrait, artificial smile, centered subject,
  symmetric composition, stock photo lighting, flat background, white background,
  text, labels, arrows, captions, watermarks, anachronistic objects"

TECHNICAL SUFFIX (scientific):
  "photorealistic documentary photography, macro lens, warm amber studio
  light, organic texture, Flow AI motion compatible, --ar [RATIO]"

FAILURE MODES â€” never do these:
  âœ— Paraphrasing a character's numerical anchors ("long beard" â‰  "12cm beard")
  âœ— Every scene defaulting to "old manuscript on wooden table"
  âœ— Every interior defaulting to the same stone-arch archive room
  âœ— Ignoring the era field and defaulting to a medieval European aesthetic
  âœ— Ignoring the timeOfDay field (night scenes must have night light)
  âœ— Replacing every human scene with landscape because faces are hard
  âœ— Generic "dust motes and shaft of light" as default dramatic device
  âœ— Crowd scenes rendered as neat orderly lines (use one of the 6 crowd techniques above)
  âœ— Full army/crowd arranged facing camera (always fragment, angle, witness, or detail)

THEATRE TEST (run before outputting every prompt):
  Ask: "Could this scene appear in a stage play?"
    If YES â€” composition is too arranged. Redesign with asymmetry, interrupted motion, environmental contact.
  Ask: "Would the subject pose differently if no camera were present?"
    If NO â€” the moment is staged. Add weight shift, interruption, or engagement with environment.
  Ask: "Is the subject's eye line going to the lens?"
    If YES â€” redesign completely. Eyes must go to another person, an object, the horizon, or the ground.
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 6  PROJECT TYPE CONTEXTS
//      Three distinct production registers, each with unique demands.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DOCUMENTARY_CONTEXT = `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  PRODUCTION CONTEXT:         â•‘
â•‘  DOCUMENTARY / NON-FICTION   â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

PURPOSE: To create images that feel extracted from reality â€”
as if a camera crew was present, caught this moment, and kept rolling.

THE DOCUMENTARY REGISTER:
  â€¢ Observational, not staged. People caught doing, not performing.
  â€¢ The camera is a witness, not a director.
  â€¢ Light is found, not designed â€” but found light can be extraordinary.
  â€¢ Imperfection is a feature: slightly asymmetric, not perfectly composed.
  â€¢ Emotional truth over visual perfection.

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

FOUND vs DESIGNED LIGHT (CRITICAL):
  Documentary light is found, not designed. The camera finds light that already exists.
  Every light source must be named and physically motivated.
  âœ“ "shaft of noon sun through a cracked wall"
  âœ“ "fire from the hearth throwing left-side warmth onto his face"
  âœ“ "overcast white sky acting as a giant soft box"
  âœ— "dramatic side lighting" (source unnamed â€” designed, not found)
  âœ— "cinematic lighting" (meaningless â€” all lighting is cinematic)
  âœ— "beautiful golden hour light" (aesthetic adjective, not physical source)

COLOUR (documentary):
  Era-driven. Emotion-modulated.
  Grief: push toward cool grey-blue.
  Joy:   push toward warm amber-gold.
  Tension: desaturate, push contrast.
  Memory: slight warm fade, reduced saturation.
  Never: oversaturated fantasy palette, digital cyan-orange grade (commercial).
`;

const COMMERCIAL_CONTEXT = `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  PRODUCTION CONTEXT:         â•‘
â•‘  COMMERCIAL / ADVERTISING    â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

PURPOSE: To create images that sell â€” a feeling, a product, an aspiration.
Every frame is an argument. Every subject is an ambassador.

COMMERCIAL TIERS (read from scene metadata and masterPrompt):

  TIER 1 â€” PRODUCT HERO:
    The product is protagonist. Humans serve as context.
    Visual ref: precision, controlled light, isolated subject.
    DO: perfect surface, controlled reflection, shallow depth of field.
    DON'T: cluttered backgrounds, candid chaos, grain.

  TIER 2 â€” LIFESTYLE / TALENT:
    A person experiencing the brand's world. Emotion is the product.
    Visual ref: aspirational environments, confident subjects, natural light controlled.
    DO: warm, flattering light; rim light separation; purposeful wardrobe.
    DON'T: stock-photo generic happiness, vacant gaze, forced grin.

  TIER 3 â€” EMOTIONAL / BRAND STORY:
    Story-led. Emotional truth, elevated aesthetics.
    Slightly documentary-leaning but always polished.
    DO: real moments rendered beautifully.
    DON'T: raw, uncontrolled, gritty (unless brief specifies).

  TIER 4 â€” CORPORATE / INSTITUTIONAL:
    Authority, trust, professionalism. Not cold, not stiff.
    DO: confident body language, purposeful action, clean environments.
    DON'T: fake smiles, generic office clichÃ©s, flat even light.

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
  Read masterPrompt as brand bible. Every element â€” wardrobe, background,
  light temperature, colour grade direction â€” must serve the palette.
  If no palette specified: neutral backgrounds, warm skin tones,
  product as colour accent.

TALENT RULES:
  âœ“ Polished but not retouched-looking
  âœ“ 1/4 turn away from camera axis (camera-aware but not lens-direct)
  âœ“ Interacting with product or environment
  âœ— Stock-photo smile, thumbs-up, generic joy
  âœ— Blurry product (product always sharp unless deliberate rack focus)
`;

const NARRATIVE_CONTEXT = `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  PRODUCTION CONTEXT:         â•‘
â•‘  NARRATIVE / SCRIPTED FILM   â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

PURPOSE: Every frame is a word in a story. The camera has a point of view.
Light is not found â€” it is placed with intent. Every shadow has a reason.

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
    Reference: AmÃ©lie, About Time, Brooklyn.

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
    The verb of the scene â€” not the noun.

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

CHARACTER EMOTION â†’ FRAME LANGUAGE:
  Do NOT describe emotion generically.
  WRONG: "looks sad"
  RIGHT: "jaw set hard, eyes fixed on the door she is not walking through,
          slight tremor at lower lip, one hand flat against the cold wall"
  The body carries the subtext. The camera reads the body.
`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 7  RESPONSE FORMAT SPECIFICATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RESPONSE_FORMAT = `
RESPONSE FORMAT - JSON only, no markdown, no preamble

{
  "analysis": {
    "detectedEra": "string - what era was inferred from metadata",
    "visualMode": "cinematic | symbolic | scientific",
    "humanPresence": "visible_candid | silhouette | crowd | none",
    "complexity": "low | medium | high | extreme",
    "difficultyScore": 1-10,
    "productionNotes": ["string", "string"]
  },
  "cameraAngleSlots": [
    {
      "focalLength": "actual lens: 16mm ultra-wide, 24mm, 35mm standard, 50mm, 85mm portrait, 100mm macro, 200mm telephoto",
      "angleDeg": "physical tilt degree: eye-level 0deg, low angle 15-20deg, high angle 35deg, birds-eye 75-85deg, dutch canted 12deg",
      "technique": "movement: static locked-off, handheld, dolly push, dolly pull, crane jib, steadicam, zoom in, zoom out",
      "framing": "composition: extreme wide, wide, medium wide, medium, medium close-up, close-up, extreme close-up, over-the-shoulder, POV",
      "label": "Turkish short label e.g. Kus Bakisi - Asiri Genis",
      "rationale": "Turkish 1 sentence - why this angle is cinematically appropriate for this specific scene"
    },
    { "slot": 1 },
    { "slot": 2 },
    { "slot": 3 },
    { "slot": 4 },
    { "slot": 5 }
  ],
  "prompts": [
    {
      "slotIndex": 0,
      "shotType": "descriptive label matching cameraAngleSlots[0]",
      "summary": "Verbatim copy of scene visualNote (Turkish)",
      "explanation": "Bu gorsel... 1 sentence Turkish what it shows and why",
      "witnessIndicator": "specific caught signal, e.g. heel raised mid-transfer",
      "lightSource": "named physical source with direction, e.g. noon sun through cracked eastern wall",
      "prompt": "110-140 word English prompt with technical suffix"
    },
    { "slotIndex": 1, "...": "..." },
    { "slotIndex": 2, "...": "..." }
  ],
  "selectedIndex": 0
}

CRITICAL RULES FOR cameraAngleSlots:
Produce EXACTLY 6 slots. No more, no less.
Each slot must be a real cinematographer decision, NOT a generic category.
focalLength: name the actual lens with mm number.
angleDeg: specify physical tilt in degrees.
technique: name the exact movement type.
framing: name the composition frame.
All 6 slots must be MEANINGFULLY DIFFERENT from each other.
prompts array: include ONLY slotIndex 0, 1, 2. Slots 3, 4, 5 are on-demand.
`;

type RawPromptCandidate = {
  slotIndex?: number;
  shotType?: string;
  summary?: string;
  explanation?: string;
  witnessIndicator?: string;
  lightSource?: string;
  prompt?: string;
};

type RawCameraAngleSlot = {
  focalLength?: string;
  angleDeg?: string;
  technique?: string;
  framing?: string;
  label?: string;
  rationale?: string;
};


type InferredShotType = 'wide' | 'medium' | 'closeup';
type NormalizedShotType = InferredShotType | 'custom';
type NormalizedCandidate = RawPromptCandidate & {
  normalizedType: NormalizedShotType;
  originalIndex: number;
};

type PinEvaluation = {
  score: number;
  reasons: string[];
};

type ScenePinIntent = {
  preferredType: InferredShotType | null;
  scaleScore: number;
  actionScore: number;
  detailScore: number;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 8  MASTER SYSTEM PROMPT BUILDER
//      Assembles the correct system prompt by project type.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 9  ASPECT RATIO COMPOSITION GUIDANCE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ASPECT_RATIO_COMPOSITION: Record<string, string> = {
  '16:9': `Landscape cinematic widescreen (16:9). Exploit the full horizontal plane.
    Subject on LEFT or RIGHT THIRD â€” never centre. Three depth planes mandatory:
    blurred foreground element, sharp midground subject, atmospheric background.
    Horizontal screen direction must be explicit. Long cast shadows read horizontally.
    Ideal animation: parallax pan, lateral drift, slow horizontal push.`,

  '4:3': `Classic 4:3 cinematic format. Slightly more vertical breathing room.
    Subject off-centre â€” left or right third. Three depth planes required.
    Camera height must vary across the three shots.
    Good for intimate spaces, interior scenes, confrontation.
    Ideal animation: push-in, subtle drift, Ken Burns.`,

  '1:1': `Square 1:1 format. Off-centre subject in one quadrant, not at centre.
    Use foreground framing element to create depth illusion (doorframe, fabric edge,
    foliage, architectural element). Strong figure/ground tonal contrast required.
    Good for portraits, objects, social media delivery.
    Ideal animation: Ken Burns, micro-zoom, subtle sway.`,

  '9:16': `Vertical portrait (9:16). Exploit the vertical z-axis.
    Subject mid-frame but left or right of vertical centreline â€” never centred.
    Three vertical planes: foreground low + subject mid + sky/ceiling as background.
    Screen direction becomes vertical: up = aspiration, down = weight/gravity.
    Ideal animation: vertical push, upward reveal, parallax vertical drift.`,
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 10  SCENE COMPLEXITY ANALYSIS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  if (hasCrowd)            productionNotes.push('âš ï¸ Crowd scene: wide shot + silhouette + bird\'s-eye recommended');
  if (hasTransformation)   productionNotes.push('âš ï¸ Transformation scene: static phase-sequence recommended over single morph');
  if (hasArchitecture)     productionNotes.push('ğŸ›ï¸ Architectural scene: atmospheric haze + scale figure recommended');
  if (hasHistoricalFigure) productionNotes.push('ğŸ‘‘ Historical figure: character anchor protocol critical');

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 11  USER MESSAGE BUILDER
//       Constructs the complete per-scene instruction block.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getAssignedReferencesForScene(sceneId: string, references?: SceneReference[]): SceneReference[] {
  return (references ?? []).filter((reference) => reference.assignedSceneIds?.includes(sceneId));
}

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

  // â”€â”€ Scene Setting Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (timeContexts && timeContexts.length > 0) {
    parts.push(`â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
    parts.push(`â•‘  SCENE SETTING â€” READ THIS FIRST     â•‘`);
    parts.push(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
    parts.push(`âš ï¸ The following fields define the MATERIAL WORLD of this scene.`);
    parts.push(`Every object, light source, garment, and surface must belong to this world.`);
    parts.push(``);

    timeContexts.forEach(tc => {
      parts.push(`ERA / PERIOD:    ${tc.era ?? 'unspecified'}`);
      parts.push(`LABEL:          ${tc.label}`);
      if (tc.timeOfDay)      parts.push(`TIME OF DAY:    ${tc.timeOfDay} â€” THIS IS THE MANDATORY LIGHTING CONDITION`);
      if (tc.lighting)       parts.push(`LIGHTING NOTES: ${sanitizeLighting(tc.lighting)}`);
      if (tc.historicalNotes) parts.push(`HISTORICAL CONTEXT: ${tc.historicalNotes}`);
      if (tc.season)         parts.push(`SEASON:         ${tc.season}`);
      if (tc.weather)        parts.push(`WEATHER:        ${tc.weather}`);
    });

    parts.push(`âš ï¸ DO NOT override the era, time of day, or historical context with any default.`);
    parts.push(``);
  }

  // â”€â”€ Character Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const layer: NarrativeLayer = scene.narrativeLayer ?? 'historical';
  const isScientific = layer === 'scientific' || scene.visualStyle === 'scientific';

  if (isScientific) {
    parts.push(`â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
    parts.push(`â•‘  SCIENTIFIC MODE OVERRIDE            â•‘`);
    parts.push(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
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
      parts.push(`â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
      parts.push(`â•‘  CHARACTER ANCHORS â€” EMBED VERBATIM  â•‘`);
      parts.push(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
      parts.push(`âš ï¸ MANDATORY: Copy all numerical measurements EXACTLY.`);
      parts.push(`"10-12cm beard" must appear as "10-12cm beard" â€” NOT "long beard".`);
      parts.push(``);

      individualChars.forEach((char, idx) => {
        const position = idx === 0 ? 'PRIMARY' : idx === 1 ? 'SECONDARY' : 'TERTIARY';
        parts.push(`[${position} CHARACTER] ${char.name}${char.role ? ` â€” ${char.role}` : ''}`);
        if (char.age)             parts.push(`  Body age:        ${char.age}`);
        if (char.ethnicity)       parts.push(`  Phenotype:       ${char.ethnicity}`);
        if (char.physicalFeatures) parts.push(`  Face geometry:   ${char.physicalFeatures}`);
        if (char.hair)            parts.push(`  Hair:            ${char.hair}`);
        if (char.beard)           parts.push(`  Beard:           ${char.beard}`);
        if (char.clothing)        parts.push(`  Costume:         ${char.clothing}`);
        if (char.visualDescription) parts.push(`  Full anchor:     ${char.visualDescription}`);
        parts.push(`  âš ï¸ Eyes must face OFF-LENS â€” at another person, an object, or the distance.`);
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

  // â”€â”€ Location Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (locations.length > 0 && !isScientific) {
    parts.push(`â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
    parts.push(`â•‘  LOCATION ARCHITECTURE â€” EMBED VERBATIM â•‘`);
    parts.push(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
    parts.push(`âš ï¸ These are the PERMANENT architectural features of each location.`);
    parts.push(`The CURRENT CONDITION (damage, siege, festive, desolate) comes from`);
    parts.push(`the Scene Setting block above â€” use that for atmosphere.`);
    parts.push(``);

    locations.forEach((loc, idx) => {
      const role = idx === 0 ? 'PRIMARY LOCATION' : 'SECONDARY LOCATION';
      parts.push(`[${role}] ${loc.name}`);
      if (loc.visualDescription) parts.push(`  ${loc.visualDescription}`);
      parts.push(``);
    });
  }

  // â”€â”€ Scene Text & Visual Note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  parts.push(`â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—`);
  parts.push(`â•‘  SCENE CONTENT                       â•‘`);
  parts.push(`â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`);
  parts.push(`SCENE TEXT:`);
  parts.push(scene.text);
  parts.push(``);
  parts.push(`VISUAL NOTE TRANSLATION (CRITICAL):`);
  parts.push(`The visualNote is written in Turkish. Do NOT translate it literally.`);
  parts.push(`Extract the physical image it implies, then render it cinematically with texture, body mechanics, camera behaviour, and motivated light.`);
  parts.push(`Example: "Omuz ustu: yasli ellerin mektubu tutmasi, sabah isigi" becomes "Over-shoulder medium close: weathered, deeply veined hands grip a folded letter, morning window light raking across knuckle texture."`);
  parts.push(`The visual note is your brief, not your script. Go beyond it without inventing new entities.`);
  parts.push(``);
  parts.push(`VISUAL NOTE (Turkish â€” preserve this spirit in all three shots):`);
  parts.push(`"${scene.visualNote}"`);
  parts.push(``);

  // â”€â”€ Visual Style Routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isScientific) {
    parts.push(`VISUAL STYLE: scientific â€” macro photography mode`);
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
      photoreal: 'VISUAL STYLE: cinematic â€” photorealistic rendering mode',
      stylized: 'VISUAL STYLE: cinematic â€” stylized realism rendering mode',
      illustration: 'VISUAL STYLE: cinematic â€” painterly illustration rendering mode',
      animation: 'VISUAL STYLE: cinematic â€” animated feature rendering mode',
    };
    parts.push(defaultByMode[renderMode]);
  }
  parts.push(`RENDER MODE: ${renderMode} â€” keep all prompts in this same medium and visual language.`);
  parts.push(``);

  // â”€â”€ Timelapse Override â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (sceneAnalysis?.narrativeType === 'timelapse') {
    const phaseCount = sceneAnalysis.temporalComplexity === 'complex' ? 5
      : sceneAnalysis.temporalComplexity === 'moderate' ? 4 : 3;
    parts.push(`âš ï¸ TIMELAPSE SCENE: Produce ${phaseCount} temporal phases instead of Wide/Medium/Close-up.`);
    parts.push(`Each prompt must show a DIFFERENT temporal state.`);
    parts.push(`Phase 1 = initial state â†’ Phase ${phaseCount} = final transformed state.`);
    parts.push(``);
  }

  // â”€â”€ References â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sceneReferences = getAssignedReferencesForScene(scene.id, references);

  if (sceneReferences.length > 0) {
    parts.push(`REFERENCE IMAGES FOR THIS SCENE:`);
    sceneReferences.forEach((reference) => {
      const label = reference.description || reference.filePath;
      const analysis = reference.aiAnalysis?.trim();
      parts.push(`- [${reference.referenceType}] ${label}${analysis ? `: ${analysis}` : ''}`);
    });
    parts.push(`Use these references only for this scene. Preserve the source scene content if a reference conflicts with it.`);
    parts.push(``);
  }

  // â”€â”€ Master / Episode Prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const effectivePrompt = episodePrompt
    ? `${masterPrompt}\n\nEPISODE VISUAL STYLE OVERRIDE (applied on top of master):\n${episodePrompt}`
    : masterPrompt;

  if (effectivePrompt.trim()) {
    parts.push(`MASTER VISUAL BRIEF (apply to all three shots):`);
    parts.push(effectivePrompt.trim());
    parts.push(``);
  }

  // â”€â”€ Aspect Ratio Composition Guidance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const compositionGuide = ASPECT_RATIO_COMPOSITION[aspectRatio] ?? ASPECT_RATIO_COMPOSITION['16:9'];
  parts.push(`ASPECT RATIO: ${aspectRatio}`);
  parts.push(`COMPOSITION GUIDANCE: ${compositionGuide.trim()}`);
  parts.push(``);
  const hasHistoricalContext = (timeContexts ?? []).some((tc) => {
    const blob = `${tc.era ?? ''} ${tc.historicalNotes ?? ''}`.toLowerCase();
    return /\bcentury\b|\bhistorical\b|\bmedieval\b|\bancient\b|\bperiod\b|\bempire\b|\bdynasty\b|\bmigration\b/.test(blob);
  });
  const hasCrowdScene = sceneAnalysis?.hasCrowd || characters.some((character) => character.isCrowd) || characters.length >= 5;
  parts.push(`OBSERVATIONAL HUMAN STAGING (MANDATORY):`);
  parts.push(`- Every human figure must feel caught in the middle of action, reaction, labour, listening, or weight shift.`);
  parts.push(`- Include at least one witness indicator per shot: heel raised, hand half-raised, torso mid-turn, cropped limb, eyes fixed on scene partner/object/ground, dust or clothing displaced by motion.`);
  parts.push(`- Write the decisive moment one fraction of a second before or after the peak, never the generic peak pose itself.`);
  parts.push(`- Avoid portrait logic unless the source line is explicitly about identification, ritual stillness, or formal portraiture.`);
  parts.push(``);
  parts.push(`WIDE SHOT MANDATE: Show the power geometry of the space.`);
  parts.push(`- Ask: where are we, who is small, who is large, what does this place do to the human body?`);
  parts.push(`- Subject belongs on one third of the frame, never in dead centre.`);
  parts.push(`- Background must read as a world with pressure, depth, and consequence, not a decorative backdrop.`);
  parts.push(`- Motion design: horizontal parallax drift or scale-revealing pull-back.`);
  parts.push(``);
  parts.push(`MEDIUM SHOT MANDATE: Show the verb of the scene.`);
  parts.push(`- What physical action is happening right now: drawing, lifting, listening, turning, bracing, warning, working?`);
  parts.push(`- Show hands doing something and feet or torso in relationship to the ground.`);
  parts.push(`- Body axis should sit roughly 15â€“30Â° off camera axis, with weight favouring one foot or one side.`);
  parts.push(`- Motion design: slow witness push or subtle drift that stays inside documentary behaviour.`);
  parts.push(``);
  parts.push(`CLOSE-UP MANDATE: Show the thing that cannot be spoken.`);
  parts.push(`- One physical detail must carry the emotional payload: working hands, profile face in micro-expression, object held with purpose, fabric or skin under pressure.`);
  parts.push(`- Not a static face staring neutrally. Not an object arranged decoratively.`);
  parts.push(`- Motion design: precise Ken Burns move into the specific detail.`);
  parts.push(``);
  if (hasCrowdScene) {
    parts.push(`CROWD ERA ENFORCEMENT (MANDATORY):`);
    parts.push(`- Crowd wardrobe must read as collective period clothing, not generic modern pedestrians.`);
    parts.push(`- Use era-correct silhouettes, layered garments, fabric weight, headwear, belts, and footwear.`);
    parts.push(`- Do not introduce hoodies, t-shirts, denim, sneakers, zip jackets, synthetic sportswear, or modern tailoring.`);
    parts.push(`- Crowd figures should be fragmented, partially obscured, and caught in movement rather than posed in clear frontal rows.`);
    parts.push(`- Across the three prompts, show both macro density and intimate human fragments so coverage does not collapse into only sparse wides.`);
    parts.push(``);
  }

  // â”€â”€ Negative Flag Construction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const charNegatives = buildCharacterNegativeAnchors(characters);

  const baseNegatives = [
    'direct gaze', 'eye contact', 'looking at camera',
    'passport portrait', 'id photo pose', 'vesikalÄ±k',
    'artificial smile', 'frozen smile', 'thumbs up',
    'symmetric composition', 'centered subject',
    'stage-arranged crowd', 'neat rows of soldiers',
    'stock photo lighting', 'flat frontal lighting',
    'white background', 'solid colour background',
    'text', 'labels', 'arrows', 'captions', 'watermarks',
    'glowing eyes', 'electric aura', 'neon blue light',
    'hologram', 'sci-fi effect', 'anachronistic objects',
  ];
  if (hasHistoricalContext) {
    baseNegatives.push(
      'modern clothing', 'modern jacket', 'hoodie', 't-shirt', 'denim jeans',
      'sneakers', 'rubber soles', 'zipper jacket', 'synthetic sportswear',
      'contemporary tailoring', 'baseball cap', 'modern backpack'
    );
  }
  if (hasCrowdScene) {
    baseNegatives.push(
      'crowd facing camera', 'posed crowd', 'uniform modern streetwear',
      'clean coordinated modern outfits', 'fashion extras'
    );
  }

  const allNegatives = [...new Set([...baseNegatives, ...charNegatives])].join(', ');
  const arSuffix     = `--ar ${aspectRatio} --v 6 --no ${allNegatives}`;

  // â”€â”€ Final Instruction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const shotInstruction = sceneAnalysis?.narrativeType === 'timelapse'
    ? `Generate temporal phase prompts as specified above. Each phase: 110-140 words English.`
    : `CAMERA ANGLE ASSIGNMENT + SHOT PRODUCTION RULES:

STEP 1 - ASSIGN 6 CINEMATICALLY DISTINCT CAMERA SETUPS:

Design 6 camera angle slots for this scene. Each must be a real cinematographer's decision.
Ask yourself: What does each lens choice change emotionally? What angle reveals something the others don't?

Rules for the 6 slots:
- Every slot must differ in: focal length, tilt degree, movement type, and framing.
- Draw from the full range: from extreme wide establishing shots to extreme close macro details.
- Include at least one dynamic movement (dolly, crane, steadicam) and at least one static shot.
- Consider both objective observer angles AND subjective character-POV angles.
- For action/battle scenes: include overhead coverage, ground-level tension, and intimate detail.
- For intimate/dialogue scenes: include wide geography, medium interaction, and close subtext.

Example of diverse slot thinking:
  Slot 0: 16mm ultra-wide, birds-eye 80deg, crane jib descend - battlefield scale
  Slot 1: 85mm portrait, eye-level 0deg, static locked-off - psychological face read
  Slot 2: 35mm, low angle 18deg, handheld - ground-level tension
  Slot 3: 200mm telephoto, eye-level compressed, dolly pull - mass/depth compression
  Slot 4: 50mm standard, over-the-shoulder, steadicam tracking - subjective witness
  Slot 5: 100mm macro, extreme close-up, static - one irreducible physical detail

STEP 2 - GENERATE PROMPTS FOR SLOTS 0, 1, 2 ONLY:

Each of the first 3 slots gets a full cinematic prompt. Slots 3, 4, 5 are reserved for on-demand generation.

PROMPT RULES (apply to all 3 generated prompts):
Each prompt 110-140 words English.
Each must include witnessIndicator and lightSource fields.

The 3 prompts must represent MEANINGFULLY DIFFERENT perspectives on the scene.
Choose slots 0, 1, 2 to maximize visual variety: scale + action + detail is the ideal split,
but adapt to what this specific scene demands.

SLOT 0 PROMPT - Apply the camera setup defined in cameraAngleSlots[0]:
Mandatory: foreground framing element, subject off center, atmospheric depth.

SLOT 1 PROMPT - Apply the camera setup defined in cameraAngleSlots[1]:
Mandatory: Freeze the body at the verb of the scene. Weight on one foot. Body axis 15-30 degrees off camera.

SLOT 2 PROMPT - Apply the camera setup defined in cameraAngleSlots[2]:
Mandatory: One irreducible physical detail that carries the emotional weight.

DIFFERENTIATION CHECK - Before outputting, verify the 3 prompted shots differ in:
- Focal length (different lens)
- Camera height (different tilt angle)
- Movement type (at least 2 of 3 must differ)
- Compositional framing
If fewer than 3 differences: redesign.`;

  parts.push(shotInstruction);
  parts.push(``);
  parts.push(`OUTPUT FORMAT â€” ADVANCED CINEMATIC BLOCK TEMPLATE (MANDATORY):`);
  parts.push(`Write EACH prompt as a single English paragraph that still follows this block order (use short labels):`);
  parts.push(`SHOT INTENT: ... | SUBJECT: ... | ACTION: ... | ENVIRONMENT: ... | STYLE: ... | LIGHT: ... | CAMERA/COMP: ... | WITNESS: ... | CONTINUITY LOCK: ... | MOTION HINT: ... | NEGATIVES: ...`);
  parts.push(`Rules: keep STYLE and CONTENT separated; use concrete physical/material language; name the actual light source; avoid empty adjectives (beautiful, cinematic, dramatic).`);
  parts.push(`If something is unknown, omit it â€” do not invent new entities or anachronistic props.`);
  parts.push(``);
  parts.push(`PROMPT LENGTH ENFORCEMENT:`);
  parts.push(`Each prompt MUST be 110-140 words. Count before submitting.`);
  parts.push(`Under 90 words = REJECTED (not enough specificity). Over 160 words = REJECTED (too dense for AI generation).`);
  parts.push(``);
  parts.push(`QUALITY CHECK per prompt:`);
  parts.push(`- Named light source with direction and color temperature?`);
  parts.push(`- Subject body position described with measurable specifics?`);
  parts.push(`- Foreground element named, not merely implied?`);
  parts.push(`- Animation motion type specified: parallax, Ken Burns, drift, or push?`);
  parts.push(`- At least one caught indicator: weight shift, interrupted gesture, or cropped limb?`);
  parts.push(`If any checkbox is empty: rewrite that prompt.`);
  parts.push(``);
  parts.push(`Append to EVERY prompt exactly once, at the very end: ${arSuffix}`);
  parts.push(`IMPORTANT: Do NOT add --ar or --no flags anywhere else in the prompt text. Only at the very end.`);
  parts.push(``);
  parts.push(`âš ï¸ FINAL REMINDER: All subjects caught in natural action.`);
  parts.push(`No passport poses. No camera eye contact. No symmetric staging.`);
  parts.push(`When choosing selectedIndex, compare all three carefully; do not default to the wide shot just because it feels safer or more legible.`);
  parts.push(`Also do not default to medium by habit: if the scene's core value is scale, geography, formation, or world pressure, wide may be the best prompt.`);
  parts.push(`selectedIndex discipline: 0 only when world scale or geography is the core value, 1 only when body-action is clearly the core value, 2 only when tactile detail or subtext is the core value.`);
  parts.push(`Prefer the prompt with the strongest specificity, found-moment authenticity, believable action, and witness intelligence.`);

  return parts.join('\n');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 12  LIGHTING SANITISER
//       Strips physically impossible light descriptions from time context.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 13  JSON RESPONSE PARSER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 14  MAIN GENERATION FUNCTION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // Retry loop â€” up to 4 attempts
  let parsed: {
    prompts?: RawPromptCandidate[];
    cameraAngleSlots?: RawCameraAngleSlot[];
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

  const subjectRefs = getAssignedReferencesForScene(scene.id, references).filter(r => r.referenceType === 'subject');
  const normalizedCandidates = normalizePromptCandidates(parsed.prompts);
  const selectedIndexValue = Number(parsed.selectedIndex);
  const aiOriginalIndex = Number.isInteger(selectedIndexValue) ? selectedIndexValue : 0;
  const aiSelectedNewIndex = normalizedCandidates.findIndex((candidate) =>
    getCandidateSlotIndex(candidate, candidate.originalIndex) === aiOriginalIndex ||
    candidate.originalIndex === aiOriginalIndex
  );
  const effectiveAiIndex = aiSelectedNewIndex >= 0 ? aiSelectedNewIndex : 0;
  const selectedIndex = selectBestPromptIndex(
    normalizedCandidates,
    effectiveAiIndex,
    scene,
    characters,
    sceneAnalysis,
  );
  const hasCrowdScene = !!sceneAnalysis?.hasCrowd || characters.some((character) => character.isCrowd) || characters.length >= 5;
  const selectedPinReason = buildPinReason(
    normalizedCandidates[selectedIndex],
    evaluatePromptForPin(normalizedCandidates[selectedIndex], hasCrowdScene, scene),
  );

  // Parse camera angle slots from AI response first
  const rawSlots: RawCameraAngleSlot[] = Array.isArray(parsed.cameraAngleSlots)
    ? parsed.cameraAngleSlots
    : [];
  const cameraAngleSlots: CameraAngleSlot[] = rawSlots.slice(0, 6).map((s, idx) => {
    return {
      id: crypto.randomUUID(),
      focalLength: s.focalLength ?? 'Standard lens',
      angleDeg: s.angleDeg ?? 'eye-level 0deg',
      technique: s.technique ?? 'static locked-off',
      framing: s.framing ?? 'medium',
      label: s.label ?? `Slot ${idx + 1}`,
      rationale: s.rationale ?? '',
    };
  });

  const prompts: PromptCard[] = normalizedCandidates.map((p, idx) => {
    const labels: string[] = ['Prompt A', 'Prompt B', 'Prompt C'];
    const raw = (p.prompt ?? '').trim();
    const hasArFlag = /--ar\s+\d+:\d+/i.test(raw);
    const promptText = hasArFlag ? raw : `${raw} ${arSuffix}`.trim();
    const slotIdx = getCandidateSlotIndex(p, idx);
    const slot = cameraAngleSlots[slotIdx];
    const slotId = slot?.id;
    const slotLabel = slot?.label?.trim();
    const cameraSetupLabel = formatCameraSetupLabel(slot);

    const newPromptId = crypto.randomUUID();
    if (slot) {
      slot.promptId = newPromptId;
    }

    return {
      id: newPromptId,
      type: p.normalizedType === 'custom' ? undefined : p.normalizedType,
      label: slotLabel || labels[idx] || `Prompt ${idx + 1}`,
      shotType: cameraSetupLabel || formatShotTypeLabel(p.normalizedType, p.shotType),
      summary: p.summary ?? scene.visualNote,
      explanation: p.explanation ?? '',
      witnessIndicator: p.witnessIndicator ?? '',
      lightSource: p.lightSource ?? '',
      promptText,
      versions: [promptText],
      aspectRatio,
      generationType,
      hasSubjectReference: subjectRefs.length > 0,
      isPinned: idx === selectedIndex,
      isPinnedByAI: idx === selectedIndex,
      pinReason: idx === selectedIndex ? selectedPinReason : undefined,
      slotId,
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

  return { prompts, analysis, cameraAngleSlots };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 15  PROMPT REVISION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REVISION_SYSTEM_PROMPT = `You are an expert cinematographer and AI prompt engineer.
Your task is to revise an existing English image generation prompt based on a user instruction
(which may be in Turkish, English, or any language).

RULES:
  1. Preserve the original camera angle, lighting, and core composition.
  2. Seamlessly integrate the user's specific change into the existing scene.
  3. Return ONLY the final revised English prompt. No explanations, no markdown, no quotes.
  4. Keep all technical parameters (--ar, --v, --no flags) intact.
  5. If asked to remove something: remove it cleanly without breaking sentence structure.
  6. Faces may be visible for natural interaction â€” never introduce direct eye contact with lens.
  7. Do not change the shot type unless explicitly instructed.
  8. If FRESH CONTEXT is provided, treat it as the current source of truth for identity, wardrobe, facial hair, body type, location, era, and time conditions.
  9. When the original prompt conflicts with the FRESH CONTEXT, rewrite the stale attributes to match the FRESH CONTEXT while preserving the shot intent and composition.
  10. Do not keep outdated character or location traits just because they existed in the original prompt.`;

type PromptRevisionContext = {
  shotType?: string;
  sceneText?: string;
  visualNote?: string;
  projectType?: ProjectType;
  renderMode?: RenderMode;
  characters?: Character[];
  locations?: Location[];
  timeContexts?: TimeContext[];
  staleReasons?: string[];
};

export async function revisePrompt(
  originalPrompt: string,
  instruction: string,
  _apiKey?: string,
  _model?: string,
  _temperature?: number,
  revisionContext?: PromptRevisionContext,
): Promise<string> {
  const contextBlock = buildRevisionContextMessage(revisionContext);
  const userMessage = `ORIGINAL PROMPT:\n${originalPrompt}\n\nUSER INSTRUCTION:\n"${instruction}"\n${contextBlock}\nIf the fresh context conflicts with the original prompt, update the prompt to match the fresh context while keeping the same cinematic shot logic.\n\nProvide the revised English prompt:`;

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

function buildRevisionContextMessage(context?: PromptRevisionContext): string {
  if (!context) return '';

  const lines: string[] = [];

  if (context.projectType) lines.push(`PROJECT TYPE: ${context.projectType}`);
  if (context.renderMode) lines.push(`RENDER MODE: ${context.renderMode}`);
  if (context.shotType) lines.push(`SHOT TYPE TO PRESERVE: ${context.shotType}`);
  if (context.visualNote?.trim()) lines.push(`SCENE VISUAL NOTE: ${context.visualNote.trim()}`);
  if (context.sceneText?.trim()) lines.push(`SCENE TEXT: ${context.sceneText.trim()}`);
  if (context.staleReasons?.length) lines.push(`STALE REASONS: ${context.staleReasons.join(' | ')}`);

  if (context.characters?.length) {
    lines.push(`CURRENT CHARACTERS (SOURCE OF TRUTH):`);
    context.characters.forEach((character) => {
      const parts = [
        character.name,
        character.role,
        character.visualDescription,
        character.age,
        character.ethnicity,
        character.hair,
        character.beard,
        character.clothing,
        character.physicalFeatures,
        character.isCrowd ? 'crowd/group entity' : '',
      ].filter(Boolean);
      lines.push(`- ${parts.join(' | ')}`);
    });
  }

  if (context.locations?.length) {
    lines.push(`CURRENT LOCATIONS (SOURCE OF TRUTH):`);
    context.locations.forEach((location) => {
      const parts = [
        location.name,
        location.visualDescription,
        location.period,
        location.geography,
        location.architecture,
        location.atmosphere,
      ].filter(Boolean);
      lines.push(`- ${parts.join(' | ')}`);
    });
  }

  if (context.timeContexts?.length) {
    lines.push(`CURRENT TIME CONTEXT (SOURCE OF TRUTH):`);
    context.timeContexts.forEach((timeContext) => {
      const parts = [
        timeContext.label,
        timeContext.era,
        timeContext.season,
        timeContext.timeOfDay,
        timeContext.lighting,
        timeContext.weather,
        timeContext.historicalNotes,
      ].filter(Boolean);
      lines.push(`- ${parts.join(' | ')}`);
    });
  }

  if (!lines.length) return '';

  return `\nFRESH CONTEXT:\n${lines.join('\n')}\n`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Â§ 16  AUTO-PIN (BEST PROMPT SELECTION)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function inferShotType(value?: string, prompt?: string): InferredShotType | null {
  const blob = `${value ?? ''} ${prompt ?? ''}`.toLowerCase();

  if (/\bclose[-\s]?up\b|\bcloseup\b|\bmacro\b|\bdetail\b|\binsert\b|\bextreme close\b/.test(blob)) {
    return 'closeup';
  }
  if (/\bmedium\b|\bmid shot\b|\bwaist\b|\bhalf[-\s]?body\b|\bthree[-\s]?quarter\b/.test(blob)) {
    return 'medium';
  }
  if (/\bwide\b|\bestablishing\b|\baerial\b|\bbird'?s[-\s]?eye\b|\bpanoramic\b/.test(blob)) {
    return 'wide';
  }

  return null;
}

function formatShotTypeLabel(type: NormalizedShotType, original?: string): string {
  const cleaned = original?.trim();
  if (cleaned) return cleaned;
  if (type === 'closeup') return 'Close-up';
  if (type === 'medium') return 'Medium Shot';
  if (type === 'custom') return 'Camera Setup';
  return 'Wide Shot';
}

function getCandidateSlotIndex(candidate: RawPromptCandidate, fallbackIndex: number): number {
  const slotIndex = Number(candidate.slotIndex);
  return Number.isInteger(slotIndex) && slotIndex >= 0 ? slotIndex : fallbackIndex;
}

function formatCameraSetupLabel(slot?: CameraAngleSlot): string {
  if (!slot) return '';
  return [slot.focalLength, slot.framing, slot.technique]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' - ');
}

function buildCharacterNegativeAnchors(characters: Character[]): string[] {
  const negatives: string[] = [];

  characters.filter((character) => !character.isCrowd).forEach((character) => {
    const anchorBlob = [
      character.visualDescription,
      character.physicalFeatures,
      character.hair,
      character.beard,
      character.clothing,
      character.age,
      character.ethnicity,
      character.role,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (/\b(white|snow|silver|grey)\b/.test(anchorBlob) && /\b(beard|hair)\b/.test(anchorBlob)) {
      negatives.push('dark beard', 'brown beard', 'black beard', 'dark hair', 'clean-shaven', 'short beard');
    }
    if (/\b(thick|full|dense|coarse)\b/.test(anchorBlob) && /\bbeard\b/.test(anchorBlob)) {
      negatives.push('thin beard', 'patchy beard', 'stubble only');
    }
    if (/\b(turban|wrapped|headwear|coils?|crown|oversized|large|tall headwear)\b/.test(anchorBlob)) {
      negatives.push('small cap', 'bare head', 'hat', 'hood');
    }
    if (/\b(6[0-9]|7[0-9]|8[0-9]|elder|old|aged|wrinkles|crow's-feet|nasolabial)\b/.test(anchorBlob)) {
      negatives.push('young face', 'smooth skin', 'no wrinkles');
    }
    if (/\b(heavy|stocky|large|broad shoulders|90-100kg|slight belly)\b/.test(anchorBlob)) {
      negatives.push('thin figure', 'slender build');
    }
  });

  return negatives;
}

function normalizePromptCandidates(candidates: RawPromptCandidate[]): NormalizedCandidate[] {
  return candidates.map((candidate, originalIndex) => {
    const inferred = inferShotType(candidate.shotType, candidate.prompt);
    return {
      ...candidate,
      inferredType: inferred,
      normalizedType: inferred || 'custom',
      originalIndex,
    };
  }).slice(0, 3);
}

function countKeywordHits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function inferScenePinIntent(
  scene: Pick<SceneCard, 'text' | 'visualNote'>,
  hasCrowdScene: boolean,
  sceneAnalysis?: SceneAnalysis,
): ScenePinIntent {
  const sceneBlob = `${scene.visualNote ?? ''} ${scene.text ?? ''}`.toLowerCase();

  const scaleScore =
    countKeywordHits(sceneBlob, /\b(crowd|army|battle|formation|migration|procession|geography|landscape|horizon|skyline|fortress|city|desert|river|mountain|valley|encampment|camp|column|thousands|vast|panorama|strategic|kuşatma|ordu|kalabalık|savaş|manzara|ufuk|kale|şehir|çöl|nehir|dağ|vadi|göç|kervan|kamp)\b/g) +
    countKeywordHits(sceneBlob, /\b(wide|geniş|establishing|panorama|bird'?s-eye|aerial|overview|formation|horizon)\b/g) * 2 +
    (hasCrowdScene ? 3 : 0);

  const detailScore =
    countKeywordHits(sceneBlob, /\b(close|close-up|closeup|detail|texture|macro|hand|face|eye|arrow|wound|fabric|sweat|tear|finger|object|artifact|letter|coin|seal|yakın|detay|doku|el|yüz|göz|ok|yara|kumaş|ter|gözyaşı|mektup|mühür|para)\b/g) +
    countKeywordHits(sceneBlob, /\b(micro|tactile|thumb|knuckle|wrist|omuz üstü|yakın plan)\b/g) * 2;

  const actionScore =
    countKeywordHits(sceneBlob, /\b(draw|drawing|aim|aiming|ride|riding|run|running|turn|turning|listen|listening|warn|warning|carry|carrying|lift|lifting|brace|bracing|strike|striking|kneel|kneeling|pull|pulling|push|pushing|çek|ger|koş|dön|çalış|dinle|uyar|taşı|kaldır|vur|geriyor|çekiyor)\b/g) +
    countKeywordHits(sceneBlob, /\b(medium|orta plan|mid-action|gesture|motion|movement|verb)\b/g) +
    (sceneAnalysis?.narrativeType === 'sequence' ? 2 : 0);

  let preferredType: InferredShotType | null = null;

  if (hasCrowdScene && scaleScore >= actionScore - 1 && scaleScore >= detailScore) {
    preferredType = 'wide';
  } else if (scaleScore >= actionScore + 2 && scaleScore >= detailScore + 2) {
    preferredType = 'wide';
  } else if (detailScore >= scaleScore + 2 && detailScore >= actionScore + 1) {
    preferredType = 'closeup';
  } else if (!hasCrowdScene && actionScore >= scaleScore + 2 && actionScore >= detailScore + 2) {
    preferredType = 'medium';
  } else if (scaleScore >= detailScore + 1 && scaleScore >= actionScore + 1) {
    preferredType = 'wide';
  } else if (detailScore >= scaleScore + 1 && detailScore >= actionScore) {
    preferredType = 'closeup';
  }

  return { preferredType, scaleScore, actionScore, detailScore };
}

function selectBestPromptIndex(
  prompts: NormalizedCandidate[],
  aiSelectedIndex: number,
  scene: SceneCard,
  characters: Character[],
  sceneAnalysis?: SceneAnalysis,
): number {
  const AI_PREFERENCE_BONUS = 3;
  const AI_OVERRIDE_THRESHOLD = 4;
  const hasCrowdScene = !!sceneAnalysis?.hasCrowd || characters.some((character) => character.isCrowd) || characters.length >= 5;
  const scenePinIntent = inferScenePinIntent(scene, hasCrowdScene, sceneAnalysis);
  const aiIndex = Number.isInteger(aiSelectedIndex) && Number(aiSelectedIndex) >= 0 && Number(aiSelectedIndex) < prompts.length
    ? Number(aiSelectedIndex)
    : 0;

  const scoredPrompts = prompts.map((prompt, index) => {
    const evaluation = evaluatePromptForPin(prompt, hasCrowdScene, scene);
    let score = evaluation.score + (index === aiIndex ? AI_PREFERENCE_BONUS : 0);

    if (scenePinIntent.preferredType === prompt.normalizedType) {
      score += 5;
    }
    if (scenePinIntent.preferredType && prompt.normalizedType === 'medium' && scenePinIntent.preferredType !== 'medium') {
      score -= 3;
    }
    if (scenePinIntent.preferredType === 'wide' && prompt.normalizedType === 'closeup' && scenePinIntent.scaleScore >= scenePinIntent.detailScore + 3) {
      score -= 1;
    }
    if (scenePinIntent.preferredType === 'closeup' && prompt.normalizedType === 'wide' && scenePinIntent.detailScore >= scenePinIntent.scaleScore + 3) {
      score -= 1;
    }

    return { index, score };
  });

  const bestCandidate = scoredPrompts.reduce((best, current) => current.score > best.score ? current : best, scoredPrompts[0]);
  const aiCandidate = scoredPrompts[aiIndex] ?? scoredPrompts[0];

  if (!bestCandidate || !aiCandidate) {
    return aiIndex;
  }

  if (bestCandidate.score - aiCandidate.score <= AI_OVERRIDE_THRESHOLD) {
    return aiCandidate.index;
  }

  return bestCandidate.index;
}

function evaluatePromptForPin(
  prompt: NormalizedCandidate,
  hasCrowdScene: boolean,
  scene: Pick<SceneCard, 'text' | 'visualNote'>,
): PinEvaluation {
  const sceneBlob = `${scene.visualNote ?? ''} ${scene.text ?? ''}`.toLowerCase();
  const promptBlob = `${prompt.shotType ?? ''} ${prompt.prompt ?? ''} ${prompt.explanation ?? ''} ${prompt.witnessIndicator ?? ''} ${prompt.lightSource ?? ''}`.toLowerCase();
  const sceneWantsScale = /\b(crowd|army|battle|formation|migration|procession|geography|landscape|horizon|skyline|fortress|city|desert|river|mountain|valley|encampment|camp|column|thousands|vast|panorama|strategic|kuşatma|ordu|kalabalık|savaş|manzara|ufuk|kale|şehir|çöl|nehir|dağ|vadi|göç|kervan|kamp)\b/.test(sceneBlob);
  const sceneWantsDetail = /\b(close|detail|texture|macro|hand|face|eye|arrow|wound|fabric|sweat|tear|finger|object|artifact|letter|coin|seal|yakın|detay|doku|el|yüz|göz|ok|yara|kumaş|ter|gözyaşı|mektup|mühür|para)\b/.test(sceneBlob);
  const sceneWantsAction = /\b(draw|drawing|aim|aiming|ride|riding|run|running|turn|turning|listen|listening|warn|warning|carry|carrying|lift|lifting|brace|bracing|strike|striking|kneel|kneeling|pull|pulling|push|pushing|çek|ger|koş|dön|çalış|dinle|uyar|taşı|kaldır|vur|geriyor|çekiyor)\b/.test(sceneBlob);
  let score = 0;
  const reasons: string[] = [];

  if (sceneWantsScale && prompt.normalizedType === 'wide') {
    score += 4;
    reasons.push('Sahnenin özü scale ve geography; wide kadraj bunu doğal taşıyor.');
  }
  if (sceneWantsDetail && prompt.normalizedType === 'closeup') {
    score += 4;
    reasons.push('Sahnenin yükü tactile detail tarafında; close-up bunu en net veriyor.');
  }
  if (sceneWantsAction && prompt.normalizedType === 'medium') {
    score += 3;
    reasons.push('Sahnenin verbünü insan aksiyonu içinde en okunur bu prompt taşıyor.');
  }

  if (prompt.normalizedType === 'wide' && /\b(scale|geography|landscape|horizon|formation|column|fortress|city|river|mountain|valley|panorama|bird'?s-eye|aerial|encampment|army|mass|ocean of|sea of|çöl|nehir|dağ|vadi|ufuk|kalabalık|ordu|manzara)\b/.test(promptBlob)) {
    score += 3;
    reasons.push('World pressure, formation ve mekân ölçeği promptun içinde açıkça okunuyor.');
  }
  if (prompt.normalizedType === 'wide' && /\bforeground\b|\bdeep background\b|\batmospheric depth\b|\bleft third\b|\bright third\b|\bparallax\b|\bpull-back\b|\bscale revealing\b|\bworld before\b/.test(promptBlob)) {
    score += 2;
    reasons.push('Wide prompt kadraj mantığını foreground, thirds ve depth ile gerçekten kuruyor.');
  }
  if (prompt.normalizedType === 'medium' && /\b(mid-action|action|drawing|grip|holding|turning|running|riding|working|watching|aiming|lifting|bracing|listening|warning|hands doing|weight shift)\b/.test(promptBlob)) {
    score += 3;
    reasons.push('Mid-action insan davranışı güçlü ve gözlenmiş hissediliyor.');
  }
  if (prompt.normalizedType === 'closeup' && /\b(hand|hands|profile|gaze|thumb|fingers|texture|detail|micro|tactile|arrow|skin|fabric|sweat|tear|knuckle|wrist)\b/.test(promptBlob)) {
    score += 3;
    reasons.push('Mikro detay ve tactile payload güçlü kurulmuş.');
  }

  if (/\bmid-action\b|\bdrawing\b|\bgrip\b|\bholding\b|\bturning\b|\brunning\b|\briding\b|\bworking\b|\bwatching\b|\baiming\b/.test(promptBlob)) {
    score += 2;
  }
  if (/\bhand\b|\bhands\b|\bprofile\b|\bgaze\b|\bthumb\b|\bfingers\b|\btexture\b|\bdetail\b|\bmicro\b|\btactile\b|\barrow\b/.test(promptBlob)) {
    score += 2;
  }
  if (/\bmid-stride\b|\bheel\b|\bweight\b|\bwrist\b|\bknuckle\b|\bknuckles\b|\btremor\b|\bpartly\b|\bpartially\b|\bhalf-raised\b|\bhalf-open\b|\binterrupted\b|\bcropped\b|\bmid-turn\b|\bmid-word\b|\boff-axis\b|\boff camera axis\b/.test(promptBlob)) {
    score += 3;
  }
  if (/\benvironment\b|\bgeography\b|\blandscape\b|\bdust\b|\bhaze\b|\briver\b|\bbackground\b|\bforeground\b/.test(promptBlob)) {
    score += 1;
  }
  if (/\bposed\b|\bportrait\b|\bbeauty\b|\bsymmetric\b|\bcentered\b|\bfacing camera\b|\bdirect gaze\b/.test(promptBlob)) {
    score -= 4;
  }
  if (/\bstaging\b|\bposed\b|\barranged\b|\bsymmetric\b|\bbalanced composition\b|\btheatrical\b|\bperformed for audience\b/.test(promptBlob)) {
    score -= 6;
  }
  if (/\bdramatic documentary frame\b|\bcinematic scene\b|\bbeautiful\b/.test(promptBlob)) {
    score -= 2;
  }
  if (sceneWantsScale && prompt.normalizedType !== 'wide' && /\b(scale reveal|geography|landscape|formation|strategic)\b/.test(promptBlob)) {
    score -= 1;
  }
  if (sceneWantsDetail && prompt.normalizedType !== 'closeup' && /\b(detail|texture|macro|micro|tactile)\b/.test(promptBlob)) {
    score -= 1;
  }
  if (sceneWantsAction && prompt.normalizedType !== 'medium' && /\b(mid-action|working|turning|listening|warning)\b/.test(promptBlob)) {
    score -= 1;
  }

  if (hasCrowdScene) {
    if (prompt.normalizedType === 'wide' && /\b3-5\b|\bfour\b|\bfive\b|\bsmall cluster\b|\bforeground only\b/.test(promptBlob)) {
      score -= 3;
    }
    if (/\bdense\b|\bmass\b|\bcluster\b|\bsea of\b|\bocean of\b|\bformation\b|\bfragmented\b|\bblurred helmets\b|\bcrowd implied\b/.test(promptBlob)) {
      score += 3;
      reasons.push('Kalabalık yoğunluğu sparseleşmeden korunuyor.');
    }
    if (prompt.normalizedType === 'wide' && /\bflag\b|\bepic\b|\bscale reveal\b/.test(promptBlob) && !/\bdense\b|\bmass\b|\bcluster\b/.test(promptBlob)) {
      score -= 2;
    }
  }

  return { score, reasons };
}

function buildPinReason(
  prompt: NormalizedCandidate | undefined,
  evaluation: PinEvaluation | undefined,
): string | undefined {
  if (!prompt || !evaluation) return undefined;

  const uniqueReasons = Array.from(new Set(evaluation.reasons)).slice(0, 2);
  if (uniqueReasons.length > 0) {
    return uniqueReasons.join(' ');
  }

  if (prompt.normalizedType === 'wide') {
    return 'Bu seçim wide kadrajın dünya ölçeğini ve mekân baskısını daha iyi taşıdığı için yapıldı.';
  }
  if (prompt.normalizedType === 'custom') {
    return 'Bu secim sahneye ozel kamera kurulumunun ana aksiyonu daha iyi tasidigi icin yapildi.';
  }
  if (prompt.normalizedType === 'closeup') {
    return 'Bu seçim close-up detayın duygusal ve fiziksel payloadı daha iyi taşıdığı için yapıldı.';
  }
  return 'Bu seçim medium kadrajın insan aksiyonunu ve sahne verbünü daha okunur taşıdığı için yapıldı.';
}

// ─────────────────────────────────────────────────────────────────────────────
// § 17  ON-DEMAND SLOT PROMPT GENERATOR
//       Generates a single prompt for a specific camera angle slot
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePromptForSlot(
  scene: SceneCard,
  slot: CameraAngleSlot,
  characters: Character[],
  locations: Location[],
  masterPrompt: string,
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16' = '16:9',
  timeContexts?: TimeContext[],
  episodePrompt?: string,
  references?: SceneReference[],
  projectType: ProjectType = 'documentary',
  renderMode: RenderMode = 'photoreal',
): Promise<PromptCard> {
  const systemPrompt = buildSystemPrompt(projectType, renderMode);
  const arSuffix = `--ar ${aspectRatio} --v 6`;

  const charNegatives = buildCharacterNegativeAnchors(characters);
  const baseNegatives = [
    'direct gaze', 'eye contact', 'looking at camera',
    'passport portrait', 'artificial smile', 'symmetric composition',
    'centered subject', 'stock photo lighting', 'white background',
    'text', 'labels', 'watermarks', 'glowing eyes',
  ];
  const allNegatives = [...new Set([...baseNegatives, ...charNegatives])].join(', ');
  const fullArSuffix = `--ar ${aspectRatio} --v 6 --no ${allNegatives}`;

  const slotContext = `
CAMERA SETUP FOR THIS PROMPT (NON-NEGOTIABLE):
Focal Length: ${slot.focalLength}
Tilt/Angle: ${slot.angleDeg}
Camera Movement: ${slot.technique}
Compositional Framing: ${slot.framing}
Why this angle was chosen: ${slot.rationale}

You MUST honor this exact camera setup in the prompt.
The focal length, angle, movement, and framing are pre-determined by the director.
Write the prompt as if this specific camera setup is locked in.
`;

  const baseUserMessage = buildUserMessage(
    scene,
    characters,
    locations,
    masterPrompt,
    aspectRatio,
    renderMode,
    timeContexts,
    episodePrompt,
    references,
  );

  const slotInstruction = `
SINGLE PROMPT GENERATION FOR SPECIFIC CAMERA SLOT:

${slotContext}

Generate ONE prompt (110-140 words English) for this specific camera setup.
The prompt must honor the exact focal length, angle, movement, and framing defined above.
Include witnessIndicator and lightSource.
Append at the very end: ${fullArSuffix}

RESPONSE FORMAT - JSON only:
{
  "shotType": "descriptive label for this camera setup",
  "summary": "scene visualNote verbatim (Turkish)",
  "explanation": "Bu gorsel... 1 sentence Turkish",
  "witnessIndicator": "specific caught signal",
  "lightSource": "named physical source with direction",
  "prompt": "110-140 word English prompt"
}
`;

  const userMessage = `${baseUserMessage}\n\n${slotInstruction}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await aiProvider.generateContent(userMessage, systemPrompt, {
        operationType: 'prompt_generation',
      });

      if (!raw?.trim()) continue;

      const parsed = tryParseJSON(raw) as RawPromptCandidate | null;
      if (!parsed?.prompt) continue;

      const rawText = (parsed.prompt ?? '').trim();
      const hasArFlag = /--ar\s+\d+:\d+/i.test(rawText);
      const promptText = hasArFlag ? rawText : `${rawText} ${arSuffix}`.trim();
      const cameraSetupLabel = formatCameraSetupLabel(slot);

      return {
        id: crypto.randomUUID(),
        type: inferShotType(parsed.shotType, parsed.prompt) ?? undefined,
        label: slot.label,
        shotType: cameraSetupLabel || parsed.shotType || slot.label,
        summary: parsed.summary ?? scene.visualNote,
        explanation: parsed.explanation ?? '',
        witnessIndicator: parsed.witnessIndicator ?? '',
        lightSource: parsed.lightSource ?? '',
        promptText,
        versions: [promptText],
        aspectRatio,
        generationType: 'initial',
        hasSubjectReference: getAssignedReferencesForScene(scene.id, references).some(r => r.referenceType === 'subject'),
        isPinned: false,
        isPinnedByAI: false,
        slotId: slot.id,
      };
    } catch (err) {
      console.warn(`[slotPromptGen] Attempt ${attempt + 1} failed:`, err);
      await delay(1500 * (attempt + 1));
    }
  }

  throw new Error(`Failed to generate prompt for slot ${slot.id} after 3 attempts`);
}




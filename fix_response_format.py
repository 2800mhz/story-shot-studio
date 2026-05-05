import re

with open('src/lib/promptGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find RESPONSE_FORMAT block
start = content.find('const RESPONSE_FORMAT = `')
end = content.find('`;', start) + 2

if start == -1:
    print('NOT FOUND')
    exit(1)

print(f'Found at chars {start}-{end}, length {end-start}')

new_format = r'''const RESPONSE_FORMAT = `
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
`;'''

content = content[:start] + new_format + content[end:]

with open('src/lib/promptGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS')

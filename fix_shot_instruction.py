import re

with open('src/lib/promptGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# The shot instruction block starts with:
old_shot_start = "  const shotInstruction = sceneAnalysis?.narrativeType === 'timelapse'\n"
old_shot_end = "If fewer than 3 differences: redesign the sequence.`;\n"

start_idx = content.find(old_shot_start)
end_idx = content.find(old_shot_end, start_idx)

if start_idx == -1 or end_idx == -1:
    print(f'NOT FOUND: start={start_idx}, end={end_idx}')
    # Try to find alternative
    idx = content.find('const shotInstruction')
    print(f'shotInstruction found at: {idx}')
    print(repr(content[idx:idx+100]))
    exit(1)

end_idx += len(old_shot_end)

new_shot = """  const shotInstruction = sceneAnalysis?.narrativeType === 'timelapse'
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
If fewer than 3 differences: redesign.`;\n"""

content = content[:start_idx] + new_shot + content[end_idx:]

with open('src/lib/promptGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS')

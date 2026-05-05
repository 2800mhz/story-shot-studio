import re

with open('src/lib/promptGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the `parsed` type declaration to include cameraAngleSlots
old_parsed_type = """  // Retry loop — up to 4 attempts
  let parsed: {
    prompts?: RawPromptCandidate[];
    analysis?: Partial<PromptAnalysis>;
    selectedIndex?: number;
  } | null = null;"""

new_parsed_type = """  // Retry loop — up to 4 attempts
  let parsed: {
    prompts?: RawPromptCandidate[];
    cameraAngleSlots?: RawCameraAngleSlot[];
    analysis?: Partial<PromptAnalysis>;
    selectedIndex?: number;
  } | null = null;"""

# Try with \r\n
old_parsed_type_crlf = old_parsed_type.replace('\n', '\r\n')
if old_parsed_type_crlf in content:
    content = content.replace(old_parsed_type_crlf, new_parsed_type.replace('\n', '\r\n'))
    print('Replaced parsed type (CRLF)')
elif old_parsed_type in content:
    content = content.replace(old_parsed_type, new_parsed_type)
    print('Replaced parsed type (LF)')
else:
    print('WARNING: parsed type not found, trying partial match')
    idx = content.find('let parsed: {')
    if idx != -1:
        print(repr(content[idx:idx+200]))

# 2. Update return statement to include cameraAngleSlots
old_return = "  return { prompts, analysis };"
new_return = """  // Parse camera angle slots from AI response
  const rawSlots: RawCameraAngleSlot[] = Array.isArray(parsed.cameraAngleSlots)
    ? parsed.cameraAngleSlots
    : [];
  const cameraAngleSlots: CameraAngleSlot[] = rawSlots.slice(0, 6).map((s, idx) => {
    const promptForSlot = (prompts[idx] ? prompts[idx] : undefined);
    return {
      id: crypto.randomUUID(),
      focalLength: s.focalLength ?? 'Standard lens',
      angleDeg: s.angleDeg ?? 'eye-level 0deg',
      technique: s.technique ?? 'static locked-off',
      framing: s.framing ?? 'medium',
      label: s.label ?? `Slot ${idx + 1}`,
      rationale: s.rationale ?? '',
      promptId: promptForSlot?.id,
    };
  });

  return { prompts, analysis, cameraAngleSlots };"""

if old_return in content:
    content = content.replace(old_return, new_return)
    print('Replaced return statement')
else:
    old_return_crlf = "  return { prompts, analysis };\r\n"
    if old_return_crlf in content:
        content = content.replace(old_return_crlf, new_return + '\r\n')
        print('Replaced return statement (CRLF)')
    else:
        print('WARNING: return statement not found')
        idx = content.find('return { prompts, analysis }')
        if idx != -1:
            print(repr(content[idx-10:idx+50]))

with open('src/lib/promptGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('DONE')

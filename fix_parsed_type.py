with open('src/lib/promptGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_type = """let parsed: {
    prompts?: RawPromptCandidate[];
    analysis?: Partial<PromptAnalysis>;
    selectedIndex?: number;
  } | null = null;"""

new_type = """let parsed: {
    prompts?: RawPromptCandidate[];
    cameraAngleSlots?: RawCameraAngleSlot[];
    analysis?: Partial<PromptAnalysis>;
    selectedIndex?: number;
  } | null = null;"""

if old_type in content:
    content = content.replace(old_type, new_type)
    print('SUCCESS - replaced parsed type')
else:
    print('NOT FOUND')
    idx = content.find('let parsed: {')
    if idx != -1:
        print(repr(content[idx:idx+250]))

with open('src/lib/promptGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(content)

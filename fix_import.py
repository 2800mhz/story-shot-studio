with open('src/lib/promptGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CameraAngleSlot to imports
old_import = """import type {
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
} from '@/types';"""

new_import = """import type {
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
} from '@/types';"""

if old_import in content:
    content = content.replace(old_import, new_import)
    print('Added CameraAngleSlot to imports')
else:
    # Try CRLF
    old_import_crlf = old_import.replace('\n', '\r\n')
    new_import_crlf = new_import.replace('\n', '\r\n')
    if old_import_crlf in content:
        content = content.replace(old_import_crlf, new_import_crlf)
        print('Added CameraAngleSlot to imports (CRLF)')
    else:
        print('WARNING: imports not found')

with open('src/lib/promptGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('DONE')

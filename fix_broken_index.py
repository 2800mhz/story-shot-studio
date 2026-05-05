with open('src/pages/Index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The broken part is:
# "  }, [dispatch]);\n              variant=\"ghost\""
# We need to insert the missing lines between them

broken_marker = '  }, [dispatch]);\n              variant="ghost"'
if broken_marker not in content:
    print('Broken marker not found - file may be different')
    # Show what's around line 1254
    lines = content.split('\n')
    for i, line in enumerate(lines[1248:1260], start=1249):
        print(f'{i}: {repr(line)}')
    exit(1)

# The fix: insert the handleGenerateSlotPrompt + return ( + div line
fixed = '  }, [dispatch]);\n\n  const handleGenerateSlotPrompt = async (sceneId: string, slotId: string) => {\n    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);\n    const slot = scene?.cameraAngleSlots?.find(sl => sl.id === slotId);\n    if (!scene || !slot) return;\n\n    dispatch({ type: \'START_SLOT_PROMPT_GENERATION\', payload: { sceneId, slotId } });\n\n    try {\n      const sceneCharacters = stateRef.current.characters.filter(c => scene.characterIds.includes(c.id));\n      const sceneLocations = stateRef.current.locations.filter(l => scene.locationIds.includes(l.id));\n      const sceneTimeContexts = stateRef.current.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));\n\n      const { generatePromptForSlot } = await import(\'@/lib/promptGenerator\');\n      const prompt = await generatePromptForSlot(\n        scene,\n        slot,\n        sceneCharacters,\n        sceneLocations,\n        stateRef.current.masterPrompt,\n        aspectRatio,\n        sceneTimeContexts,\n        stateRef.current.episodePrompt || undefined,\n        stateRef.current.references,\n        stateRef.current.projectType,\n        stateRef.current.renderMode,\n      );\n\n      dispatch({ type: \'FINISH_SLOT_PROMPT_GENERATION\', payload: { sceneId, slotId, prompt } });\n    } catch (error) {\n      console.error(\'Slot prompt generation error:\', error);\n      dispatch({ type: \'SET_CAMERA_ANGLE_SLOTS\', payload: {\n        sceneId,\n        slots: (stateRef.current.sceneCards.find(s => s.id === sceneId)?.cameraAngleSlots ?? []).map(sl =>\n          sl.id === slotId ? { ...sl, isGenerating: false } : sl\n        )\n      }});\n    }\n  };\n\n  return (\n    <div className="flex h-screen flex-col bg-background">\n      {projectId && episodeId && (\n        <div className="flex items-center justify-between border-b bg-card px-4 py-2">\n          <div className="flex items-center gap-4">\n            <Button\n              variant="ghost"'

content = content.replace(broken_marker, fixed, 1)

with open('src/pages/Index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('SUCCESS')

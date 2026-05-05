import sys

filepath = 'src/pages/Index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  const handleGenerateSlotPrompt = async (sceneId: string, slotId: string) => {
    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);
    const slot = scene?.cameraAngleSlots?.find(sl => sl.id === slotId);
    if (!scene || !slot) return;

    dispatch({ type: 'START_SLOT_PROMPT_GENERATION', payload: { sceneId, slotId } });

    try {
      const sceneCharacters = stateRef.current.characters.filter(c => scene.characterIds.includes(c.id));
      const sceneLocations = stateRef.current.locations.filter(l => scene.locationIds.includes(l.id));
      const sceneTimeContexts = stateRef.current.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));

      const { generatePromptForSlot } = await import('@/lib/promptGenerator');
      const prompt = await generatePromptForSlot(
        scene,
        slot,
        sceneCharacters,
        sceneLocations,
        stateRef.current.masterPrompt,
        aspectRatio,
        sceneTimeContexts,
        stateRef.current.episodePrompt || undefined,
        stateRef.current.references,
        stateRef.current.projectType,
        stateRef.current.renderMode,
      );

      dispatch({ type: 'FINISH_SLOT_PROMPT_GENERATION', payload: { sceneId, slotId, prompt } });
    } catch (error) {
      console.error('Slot prompt generation error:', error);
      dispatch({ type: 'SET_CAMERA_ANGLE_SLOTS', payload: {
        sceneId,
        slots: (stateRef.current.sceneCards.find(s => s.id === sceneId)?.cameraAngleSlots ?? []).map(sl =>
          sl.id === slotId ? { ...sl, isGenerating: false } : sl
        )
      }});
    }
  };"""

if target in content:
    content = content.replace(target, "")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Removed old handleGenerateSlotPrompt.")
else:
    print("Old handleGenerateSlotPrompt not found.")

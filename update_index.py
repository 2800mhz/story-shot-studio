import sys

filepath = 'src/pages/Index.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace import
target1 = "import { generatePromptsForScene, revisePrompt } from '@/lib/promptGenerator';"
replacement1 = "import { generatePromptsForScene, revisePrompt, generatePromptForSlot } from '@/lib/promptGenerator';"
content = content.replace(target1, replacement1)

# Add handleGenerateSlotPrompt
target2 = """      return false;
    }
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.sceneAnalyses, state.timeContexts, state.projectType, state.renderMode, dispatch, aspectRatio]);"""

replacement2 = """      return false;
    }
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.sceneAnalyses, state.timeContexts, state.projectType, state.renderMode, dispatch, aspectRatio]);

  const handleGenerateSlotPrompt = useCallback(async (sceneId: string, slotId: string) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;
    const slot = scene.cameraAngleSlots?.find(s => s.id === slotId);
    if (!slot) return;

    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    dispatch({ type: 'START_SLOT_PROMPT_GENERATION', payload: { sceneId, slotId } });

    const sceneCharacters = state.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = state.locations.filter(l => scene.locationIds.includes(l.id));
    const sceneTimeContexts = state.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));

    try {
      const prompt = await generatePromptForSlot(
        slot,
        scene,
        sceneCharacters,
        sceneLocations,
        state.masterPrompt,
        aspectRatio,
        state.sceneAnalyses[sceneId],
        sceneTimeContexts,
        state.episodePrompt || undefined,
        state.references,
        state.projectType,
        state.renderMode
      );
      dispatch({ type: 'FINISH_SLOT_PROMPT_GENERATION', payload: { sceneId, slotId, prompt } });
    } catch (e: any) {
      console.error('Slot prompt generation failed:', e);
      // Revert generation state
      const revertedSlots = (scene.cameraAngleSlots || []).map(s => 
        s.id === slotId ? { ...s, isGenerating: false } : s
      );
      dispatch({ type: 'SET_CAMERA_ANGLE_SLOTS', payload: { sceneId, slots: revertedSlots } });
      toast({
        title: 'Hata',
        description: 'Bu açı için prompt üretilemedi.',
        variant: 'destructive'
      });
    }
  }, [state, dispatch, toast, aspectRatio]);"""

content = content.replace(target2, replacement2)

# Pass to RightPanel
target3 = """                onSetPinnedPrompt={handleSetPinnedPrompt}
                onRemoveCharacterFromSceneCard={handleRemoveCharacterFromSceneCard}"""
replacement3 = """                onSetPinnedPrompt={handleSetPinnedPrompt}
                onGenerateSlotPrompt={handleGenerateSlotPrompt}
                onRemoveCharacterFromSceneCard={handleRemoveCharacterFromSceneCard}"""
content = content.replace(target3, replacement3)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Index.tsx updated.")

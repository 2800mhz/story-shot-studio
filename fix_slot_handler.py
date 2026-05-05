with open('src/pages/Index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the location just before "  return ("
# Look for pattern after handleRemoveLocationFromSceneCard
search = "  }, [dispatch]);\n\n  return ("
if search not in content:
    search_crlf = "  }, [dispatch]);\r\n\r\n  return ("
    if search_crlf in content:
        idx = content.find(search_crlf)
        print(f'Found CRLF at {idx}')
        # Check context
        print(repr(content[idx-200:idx+50]))
    else:
        print('NOT FOUND')
        # Just find return (
        idx = content.rfind('\n  return (')
        print(f'return ( at {idx}')
        print(repr(content[idx-100:idx+20]))
    exit(0)

new_handler = """  }, [dispatch]);

  const handleGenerateSlotPrompt = async (sceneId: string, slotId: string) => {
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
  };

  return ("""

content = content.replace(search, new_handler, 1)
with open('src/pages/Index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('SUCCESS')

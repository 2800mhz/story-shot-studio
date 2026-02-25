import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { LeftPanel } from '@/components/LeftPanel';
import { CenterPanel } from '@/components/CenterPanel';
import { RightPanel } from '@/components/RightPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { InfoModal } from '@/components/InfoModal';
import { ExportModal } from '@/components/ExportModal';
import { useAppState } from '@/hooks/useAppState';
import { parseDocument } from '@/lib/documentParser';
import { parseEpisodes } from '@/lib/contextDetection';
import { generatePrompts, revisePrompt, loadSystemPrompt } from '@/lib/geminiApi';
import { analyzeTextIntoScenes } from '@/lib/sceneAnalyzer';
import { generatePromptsForScene } from '@/lib/promptGenerator';
import type { TextSegment, Scene, SubScene, PromptVariant, ConsistencyGroup } from '@/types';


const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const PROMPT_GENERATION_DELAY_MS = 2000;

const Index = () => {
  const { state, dispatch, undo, redo } = useAppState();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const bulkAbortRef = useRef<AbortController | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  // Use a ref to access current scenes without adding them as a callback dependency
  const scenesRef = useRef(state.scenes);
  scenesRef.current = state.scenes;

  // Ctrl+Z / Ctrl+Y global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't hijack input fields
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  const getActiveKey = useCallback(() => {
    if (state.apiKeys.length === 0) return null;
    return state.apiKeys[state.currentKeyIndex % state.apiKeys.length];
  }, [state.apiKeys, state.currentKeyIndex]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const text = await parseDocument(file);
      dispatch({ type: 'SET_MAIN_TEXT', payload: { text, fileName: file.name } });
      const episodes = parseEpisodes(text);
      dispatch({ type: 'SET_EPISODES', payload: episodes });
    } catch (e) {
      console.error('Dosya okunamadı', e);
    }
  }, [dispatch]);

  const handleAddScene = useCallback((segment: TextSegment, episodeTitle: string) => {
    const scene: Scene = {
      id: `scene-${Date.now()}`,
      number: state.scenes.length + 1,
      episodeTitle,
      segments: [segment],
      subjectReferences: [],
      consistencyGroupIds: [],
      prompts: [],
      status: 'pending',
    };
    dispatch({ type: 'ADD_SCENE', payload: scene });
    dispatch({ type: 'SET_ACTIVE_SCENE', payload: scene.id });
  }, [dispatch, state.scenes.length]);

  const handleAddReference = useCallback((segment: TextSegment) => {
    const targetScene = state.scenes.find(s => s.id === state.activeSceneId) || state.scenes[state.scenes.length - 1];
    if (!targetScene) return;
    dispatch({ type: 'ADD_SUBJECT_REFERENCE', payload: { sceneId: targetScene.id, segment } });
  }, [dispatch, state.scenes, state.activeSceneId]);

  const handleAppendToLastScene = useCallback((segment: TextSegment) => {
    const activeScene = state.scenes.find(s => s.id === state.activeSceneId) || state.scenes[state.scenes.length - 1];
    if (!activeScene) return;
    dispatch({ type: 'ADD_SEGMENT_TO_SCENE', payload: { sceneId: activeScene.id, segment } });
  }, [dispatch, state.scenes, state.activeSceneId]);

  const handleAddConsistency = useCallback((segment: TextSegment, groupId: string | null) => {
    const activeScene = state.scenes.find(s => s.id === state.activeSceneId) || state.scenes[state.scenes.length - 1];
    if (!activeScene) return;

    let targetGroupId = groupId;
    if (!targetGroupId) {
      const label = GROUP_LABELS[state.consistencyGroups.length % GROUP_LABELS.length];
      const newGroup: ConsistencyGroup = {
        id: `group-${Date.now()}`,
        label,
        color: `highlight-group-${label.toLowerCase()}`,
        sceneIds: [],
      };
      dispatch({ type: 'ADD_CONSISTENCY_GROUP', payload: newGroup });
      targetGroupId = newGroup.id;
    }

    dispatch({ type: 'ADD_SCENE_TO_GROUP', payload: { groupId: targetGroupId, sceneId: activeScene.id } });
  }, [dispatch, state.scenes, state.activeSceneId, state.consistencyGroups]);

  const handleAddSceneToGroup = useCallback((sceneId: string, groupId: string | null) => {
    let targetGroupId = groupId;
    if (!targetGroupId) {
      const label = GROUP_LABELS[state.consistencyGroups.length % GROUP_LABELS.length];
      const newGroup: ConsistencyGroup = {
        id: `group-${Date.now()}`,
        label,
        color: `highlight-group-${label.toLowerCase()}`,
        sceneIds: [],
      };
      dispatch({ type: 'ADD_CONSISTENCY_GROUP', payload: newGroup });
      targetGroupId = newGroup.id;
    }
    dispatch({ type: 'ADD_SCENE_TO_GROUP', payload: { groupId: targetGroupId, sceneId } });
  }, [dispatch, state.consistencyGroups]);

  const handleRemoveSceneFromGroup = useCallback((sceneId: string, groupId: string) => {
    dispatch({ type: 'REMOVE_SCENE_FROM_GROUP', payload: { groupId, sceneId } });
  }, [dispatch]);

  const handleDeletePrompt = useCallback((sceneId: string, promptId: string) => {
    dispatch({ type: 'REMOVE_PROMPT', payload: { sceneId, promptId } });
  }, [dispatch]);

  const handleAttachEntity = useCallback((sceneId: string, promptId: string, entityId: string) => {
    dispatch({ type: 'ATTACH_ENTITY_TO_PROMPT', payload: { sceneId, promptId, entityId } });
  }, [dispatch]);

  const handleDetachEntity = useCallback((sceneId: string, promptId: string, entityId: string) => {
    dispatch({ type: 'DETACH_ENTITY_FROM_PROMPT', payload: { sceneId, promptId, entityId } });
  }, [dispatch]);

  const handleSetSceneNote = useCallback((sceneId: string, note: string) => {
    dispatch({ type: 'SET_SCENE_NOTE', payload: { sceneId, note } });
  }, [dispatch]);

  const handleSetGroupNote = useCallback((groupId: string, note: string) => {
    dispatch({ type: 'SET_GROUP_NOTE', payload: { groupId, note } });
  }, [dispatch]);

  // ─── Sub-scene handlers ───────────────────────────────────────────
  const handleAddSubScene = useCallback((sceneId: string, label: string) => {
    const parentScene = state.scenes.find(s => s.id === sceneId);
    if (!parentScene) return;
    const subScene: SubScene = {
      id: `subscene-${Date.now()}`,
      parentSceneId: sceneId,
      label,
      segments: [{ id: `seg-${Date.now()}`, text: label, startIndex: 0, endIndex: label.length }],
      subjectReferences: [],
      consistencyGroupIds: [],
      prompts: [],
      status: 'pending',
    };
    dispatch({ type: 'ADD_SUB_SCENE', payload: { sceneId, subScene } });
  }, [dispatch, state.scenes]);

  const handleRemoveSubScene = useCallback((sceneId: string, subSceneId: string) => {
    dispatch({ type: 'REMOVE_SUB_SCENE', payload: { sceneId, subSceneId } });
  }, [dispatch]);

  const handleSetSubSceneNote = useCallback((sceneId: string, subSceneId: string, note: string) => {
    dispatch({ type: 'SET_SUB_SCENE_NOTE', payload: { sceneId, subSceneId, note } });
  }, [dispatch]);

  const handleDeleteSubScenePrompt = useCallback((sceneId: string, subSceneId: string, promptId: string) => {
    dispatch({ type: 'REMOVE_SUB_SCENE_PROMPT', payload: { sceneId, subSceneId, promptId } });
  }, [dispatch]);

  const handleAddSubSceneToGroup = useCallback((sceneId: string, subSceneId: string, groupId: string | null) => {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const subScene = (scene.subScenes || []).find(ss => ss.id === subSceneId);
    if (!subScene) return;

    let targetGroupId = groupId;
    if (!targetGroupId) {
      const label = GROUP_LABELS[state.consistencyGroups.length % GROUP_LABELS.length];
      const newGroup: ConsistencyGroup = {
        id: `group-${Date.now()}`,
        label,
        color: `highlight-group-${label.toLowerCase()}`,
        sceneIds: [],
      };
      dispatch({ type: 'ADD_CONSISTENCY_GROUP', payload: newGroup });
      targetGroupId = newGroup.id;
    }

    const updated: SubScene = {
      ...subScene,
      consistencyGroupIds: subScene.consistencyGroupIds.includes(targetGroupId)
        ? subScene.consistencyGroupIds
        : [...subScene.consistencyGroupIds, targetGroupId],
    };
    dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: updated } });
  }, [dispatch, state.scenes, state.consistencyGroups]);

  const handleRemoveSubSceneFromGroup = useCallback((sceneId: string, subSceneId: string, groupId: string) => {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const subScene = (scene.subScenes || []).find(ss => ss.id === subSceneId);
    if (!subScene) return;
    const updated: SubScene = {
      ...subScene,
      consistencyGroupIds: subScene.consistencyGroupIds.filter(gId => gId !== groupId),
    };
    dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: updated } });
  }, [dispatch, state.scenes]);

  const handleGenerateSubScene = useCallback(async (sceneId: string, subSceneId: string) => {
    const apiKey = getActiveKey();
    if (!apiKey) { setSettingsOpen(true); return; }
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const subScene = (scene.subScenes || []).find(ss => ss.id === subSceneId);
    if (!subScene) return;

    const updatedSub: SubScene = { ...subScene, status: 'generating' };
    dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: updatedSub } });

    const parentGroups = state.consistencyGroups.filter(g => scene.consistencyGroupIds?.includes(g.id));
    const subGroups = state.consistencyGroups.filter(g => subScene.consistencyGroupIds?.includes(g.id));

    try {
      const results = await generatePrompts({
        scene,
        apiKey,
        model: state.settings.model,
        variantCount: state.settings.variantCount,
        temperature: state.settings.temperature,
        consistencyGroups: subGroups.length > 0 ? subGroups : undefined,
        allScenes: state.scenes,
        systemPrompt: loadSystemPrompt(),
        subScene,
        parentScene: scene,
        parentConsistencyGroups: parentGroups.length > 0 ? parentGroups : undefined,
      });
      dispatch({ type: 'ROTATE_API_KEY' });

      const prompts: PromptVariant[] = results.map((r, i) => ({
        id: `prompt-${Date.now()}-${i}`,
        shotType: r.shotType,
        text: r.text,
        summary: r.summary,
        attachedEntityIds: [],
        versions: [r.text],
        isRevising: false,
      }));
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, prompts, status: 'done' } } });
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT') {
        // Retry with key rotation, max attempts = total keys
        const totalKeys = state.apiKeys.length;
        let triedKeys = 1;
        dispatch({ type: 'ROTATE_API_KEY' });
        while (triedKeys < totalKeys) {
          await new Promise(r => setTimeout(r, 2000));
          const nextKey = state.apiKeys[(state.currentKeyIndex + triedKeys) % totalKeys];
          try {
            const results2 = await generatePrompts({
              scene, apiKey: nextKey, model: state.settings.model,
              variantCount: state.settings.variantCount, temperature: state.settings.temperature,
              consistencyGroups: subGroups.length > 0 ? subGroups : undefined,
              allScenes: state.scenes, systemPrompt: loadSystemPrompt(),
              subScene, parentScene: scene,
              parentConsistencyGroups: parentGroups.length > 0 ? parentGroups : undefined,
            });
            dispatch({ type: 'ROTATE_API_KEY' });
            const prompts2: PromptVariant[] = results2.map((r, i) => ({
              id: `prompt-${Date.now()}-${i}`, shotType: r.shotType, text: r.text, summary: r.summary, attachedEntityIds: [], versions: [r.text], isRevising: false,
            }));
            dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, prompts: prompts2, status: 'done' } } });
            return;
          } catch (e2: any) {
            if (e2.message === 'RATE_LIMIT') { triedKeys++; dispatch({ type: 'ROTATE_API_KEY' }); }
            else break;
          }
        }
      }
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, status: 'error' } } });
    }
  }, [state, dispatch, getActiveKey]);

  const handleReviseSubScene = useCallback(async (sceneId: string, subSceneId: string, promptId: string, instruction: string) => {
    const apiKey = getActiveKey();
    if (!apiKey) return;
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const subScene = (scene.subScenes || []).find(ss => ss.id === subSceneId);
    if (!subScene) return;
    const prompt = subScene.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      const revised = await revisePrompt(prompt.text, instruction, apiKey, state.settings.model, state.settings.temperature);
      dispatch({ type: 'ROTATE_API_KEY' });
      const updatedPrompts = subScene.prompts.map(p =>
        p.id === promptId ? { ...p, text: revised, versions: [...p.versions, revised] } : p
      );
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, prompts: updatedPrompts } } });
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT' && state.apiKeys.length > 1) dispatch({ type: 'ROTATE_API_KEY' });
    }
  }, [state, dispatch, getActiveKey]);


  const handleCancel = useCallback((sceneId: string) => {
    const controller = abortControllersRef.current.get(sceneId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(sceneId);
    }
    const scene = state.scenes.find(s => s.id === sceneId);
    if (scene) {
      dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, status: 'pending' } });
    }
  }, [state.scenes, dispatch]);

  const handleGenerate = useCallback(async (sceneId: string) => {
    if (state.apiKeys.length === 0) {
      setSettingsOpen(true);
      return;
    }
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Create AbortController for this scene
    const controller = new AbortController();
    abortControllersRef.current.set(sceneId, controller);

    dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, status: 'generating' } });

    const groups = state.consistencyGroups.filter(g => scene.consistencyGroupIds?.includes(g.id));
    const totalKeys = state.apiKeys.length;
    let triedKeys = 0;

    while (triedKeys < totalKeys) {
      if (controller.signal.aborted) {
        abortControllersRef.current.delete(sceneId);
        return;
      }
      const apiKey = state.apiKeys[(state.currentKeyIndex + triedKeys) % totalKeys];
      try {
        const sceneEntities = {
          characters: state.extractedEntities.filter(e => e.type === 'character' && e.sceneIds.includes(sceneId)),
          locations: state.extractedEntities.filter(e => e.type === 'location' && e.sceneIds.includes(sceneId)),
        };
        const results = await generatePrompts({
          scene,
          apiKey,
          model: state.settings.model,
          variantCount: state.settings.variantCount,
          temperature: state.settings.temperature,
          consistencyGroups: groups.length > 0 ? groups : undefined,
          allScenes: state.scenes,
          systemPrompt: loadSystemPrompt(),
          sceneEntities: (sceneEntities.characters.length > 0 || sceneEntities.locations.length > 0) ? sceneEntities : undefined,
          sceneAnalysis: state.sceneAnalyses[sceneId],
          signal: controller.signal,
        });
        dispatch({ type: 'ROTATE_API_KEY' });

        const prompts: PromptVariant[] = results.map((r, i) => ({
          id: `prompt-${Date.now()}-${i}`,
          shotType: r.shotType,
          text: r.text,
          summary: r.summary,
          attachedEntityIds: [],
          versions: [r.text],
          isRevising: false,
        }));
        dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, prompts, status: 'done' } });
        abortControllersRef.current.delete(sceneId);
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') {
          abortControllersRef.current.delete(sceneId);
          return;
        }
        if (e.message === 'RATE_LIMIT') {
          triedKeys++;
          dispatch({ type: 'ROTATE_API_KEY' });
          await new Promise(r => setTimeout(r, 2000));
        } else {
          dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, status: 'error' } });
          abortControllersRef.current.delete(sceneId);
          return;
        }
      }
    }
    // All keys exhausted
    dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, status: 'error' } });
    abortControllersRef.current.delete(sceneId);
  }, [state, dispatch]);

  const handleGenerateAll = useCallback(async () => {
    const pending = state.scenes.filter(s => s.status === 'pending');
    const bulkController = new AbortController();
    bulkAbortRef.current = bulkController;
    setIsGeneratingAll(true);
    
    for (let i = 0; i < pending.length; i++) {
      if (bulkController.signal.aborted) break;

      const scene = pending[i];
      const sceneRef = state.scenes.find(s => s.id === scene.id);
      if (!sceneRef) continue;

      dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'generating' } });

      const groups = state.consistencyGroups.filter(g => sceneRef.consistencyGroupIds?.includes(g.id));
      let success = false;
      let triedKeys = 0;
      const totalKeys = state.apiKeys.length;

      while (!success && triedKeys < totalKeys) {
        if (bulkController.signal.aborted) {
          dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'pending' } });
          break;
        }
        const apiKey = state.apiKeys[(state.currentKeyIndex + triedKeys) % totalKeys];
        if (!apiKey) break;

        try {
          const sceneEntitiesAll = {
            characters: state.extractedEntities.filter(e => e.type === 'character' && e.sceneIds.includes(sceneRef.id)),
            locations: state.extractedEntities.filter(e => e.type === 'location' && e.sceneIds.includes(sceneRef.id)),
          };
          const results = await generatePrompts({
            scene: sceneRef,
            apiKey,
            model: state.settings.model,
            variantCount: state.settings.variantCount,
            temperature: state.settings.temperature,
            consistencyGroups: groups.length > 0 ? groups : undefined,
            allScenes: state.scenes,
            systemPrompt: loadSystemPrompt(),
            sceneEntities: (sceneEntitiesAll.characters.length > 0 || sceneEntitiesAll.locations.length > 0) ? sceneEntitiesAll : undefined,
            sceneAnalysis: state.sceneAnalyses[sceneRef.id],
            signal: bulkController.signal,
          });

          const prompts: PromptVariant[] = results.map((r, idx) => ({
            id: `prompt-${Date.now()}-${idx}`,
            shotType: r.shotType,
            text: r.text,
            summary: r.summary,
            attachedEntityIds: [],
            versions: [r.text],
            isRevising: false,
          }));
          dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, prompts, status: 'done' } });
          dispatch({ type: 'ROTATE_API_KEY' });
          success = true;
        } catch (e: any) {
          if (e.name === 'AbortError') {
            dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'pending' } });
            break;
          }
          if (e.message === 'RATE_LIMIT') {
            triedKeys++;
            dispatch({ type: 'ROTATE_API_KEY' });
            await new Promise(r => setTimeout(r, 2000));
          } else {
            dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'error' } });
            success = true;
          }
        }
      }

      if (!success && !bulkController.signal.aborted) {
        dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'error' } });
      }

      // Delay between scenes to avoid rate limits
      if (i < pending.length - 1 && !bulkController.signal.aborted) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    setIsGeneratingAll(false);
    bulkAbortRef.current = null;
  }, [state, dispatch]);

  const handleCancelAll = useCallback(() => {
    if (bulkAbortRef.current) {
      bulkAbortRef.current.abort();
    }
    // Also abort any individual scene controllers
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    // Revert all generating scenes to pending
    state.scenes.forEach(s => {
      if (s.status === 'generating') {
        dispatch({ type: 'UPDATE_SCENE', payload: { ...s, status: 'pending' } });
      }
    });
    setIsGeneratingAll(false);
  }, [state.scenes, dispatch]);

  const handleRevise = useCallback(async (sceneId: string, promptId: string, instruction: string) => {
    const apiKey = getActiveKey();
    if (!apiKey) return;
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const prompt = scene.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    try {
      const revised = await revisePrompt(prompt.text, instruction, apiKey, state.settings.model, state.settings.temperature);
      dispatch({ type: 'ROTATE_API_KEY' });
      const updatedPrompts = scene.prompts.map(p =>
        p.id === promptId
          ? { ...p, text: revised, versions: [...p.versions, revised] }
          : p
      );
      dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, prompts: updatedPrompts } });
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT' && state.apiKeys.length > 1) {
        dispatch({ type: 'ROTATE_API_KEY' });
      }
      console.error('Revizyon başarısız', e);
    }
  }, [state, dispatch, getActiveKey]);

  const handleRefreshAll = useCallback(async (sceneId: string) => {
    await handleGenerate(sceneId);
  }, [handleGenerate]);

  // ─── Two-stage AI workflow handlers ─────────────────────────────
  const handleAnalyzeText = useCallback(async (selectedText: string) => {
    const apiKey = getActiveKey();
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }

    dispatch({ type: 'START_ANALYSIS' });

    try {
      const result = await analyzeTextIntoScenes(selectedText, apiKey, state.settings.model);
      dispatch({ type: 'FINISH_ANALYSIS', payload: result });
    } catch (error) {
      console.error('Scene analysis error:', error);
      dispatch({ type: 'FINISH_ANALYSIS', payload: { sceneCards: [], characters: [], locations: [] } });
    }
  }, [dispatch, getActiveKey, state.settings.model]);

  const handleGeneratePromptsForScene = useCallback(async (sceneId: string) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const apiKey = getActiveKey();
    if (!apiKey) {
      setSettingsOpen(true);
      return;
    }

    const sceneCharacters = state.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = state.locations.filter(l => scene.locationIds.includes(l.id));

    dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

    try {
      const prompts = await generatePromptsForScene(
        scene,
        sceneCharacters,
        sceneLocations,
        state.masterPrompt,
        apiKey,
        state.settings.model
      );
      dispatch({ type: 'FINISH_PROMPT_GENERATION', payload: { sceneId, prompts } });
    } catch (error) {
      console.error('Prompt generation error:', error);
      // Revert status to analyzed on error
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [] },
      });
    }
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.settings.model, dispatch, getActiveKey]);

  const handleGenerateAllPrompts = useCallback(async () => {
    const scenesWithoutPrompts = state.sceneCards.filter(s => s.prompts.length === 0 && s.status !== 'generating');
    for (const scene of scenesWithoutPrompts) {
      await handleGeneratePromptsForScene(scene.id);
      await new Promise(resolve => setTimeout(resolve, PROMPT_GENERATION_DELAY_MS));
    }
  }, [state.sceneCards, handleGeneratePromptsForScene]);

  const handleAddNewCharacterToSceneCard = useCallback((sceneId: string, name: string) => {
    const character = {
      id: `char-${crypto.randomUUID()}`,
      name,
      description: '',
    };
    dispatch({ type: 'ADD_NEW_CHARACTER_TO_SCENE_CARD', payload: { sceneId, character } });
  }, [dispatch]);

  const handleAddNewLocationToSceneCard = useCallback((sceneId: string, name: string) => {
    const location = {
      id: `loc-${crypto.randomUUID()}`,
      name,
      description: '',
    };
    dispatch({ type: 'ADD_NEW_LOCATION_TO_SCENE_CARD', payload: { sceneId, location } });
  }, [dispatch]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header
        onUploadMain={() => mainFileRef.current?.click()}
        onExport={() => setExportOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onInfo={() => setInfoOpen(true)}
        mainFileName={state.mainFileName}
      />

      <input ref={mainFileRef} type="file" accept=".docx,.txt" className="hidden"
        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] shrink-0">
          <LeftPanel
            episodes={state.episodes}
            scenes={state.scenes}
            consistencyGroups={state.consistencyGroups}
            activeSceneId={state.activeSceneId}
            mainFileName={state.mainFileName}
            isAnalyzing={state.isAnalyzing}
            onEpisodeClick={(ep) => setScrollToIndex(ep.startIndex)}
            onSceneClick={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
            onMoveEpisode={(episodeId, newParentId) => dispatch({ type: 'MOVE_EPISODE', payload: { episodeId, newParentId } })}
            onReorderEpisodes={(eps) => dispatch({ type: 'REORDER_EPISODES', payload: eps })}
          />
        </div>

        <div className="flex-1 min-w-0">
          <CenterPanel
            mainText={state.mainText}
            scenes={state.scenes}
            activeSceneId={state.activeSceneId}
            scrollToIndex={scrollToIndex}
            onScrollComplete={() => setScrollToIndex(null)}
            onSetActiveScene={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
            onRemoveScene={id => dispatch({ type: 'REMOVE_SCENE', payload: id })}
            onAnalyzeText={handleAnalyzeText}
            isAnalyzing={state.isAnalyzing}
          />
        </div>

        <div className="w-[380px] shrink-0">
          <RightPanel
            scenes={state.scenes}
            consistencyGroups={state.consistencyGroups}
            activeSceneId={state.activeSceneId}
            extractedEntities={state.extractedEntities}
            sceneAnalyses={state.sceneAnalyses}
            onGenerate={handleGenerate}
            onCancel={handleCancel}
            onCancelAll={handleCancelAll}
            onGenerateAll={handleGenerateAll}
            isGeneratingAll={isGeneratingAll}
            onRevise={handleRevise}
            onRefreshAll={handleRefreshAll}
            onSetActiveScene={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
            onRemoveScene={id => dispatch({ type: 'REMOVE_SCENE', payload: id })}
            onAddSceneToGroup={handleAddSceneToGroup}
            onRemoveSceneFromGroup={handleRemoveSceneFromGroup}
            onDeletePrompt={handleDeletePrompt}
            onAttachEntity={handleAttachEntity}
            onDetachEntity={handleDetachEntity}
            onSetSceneNote={handleSetSceneNote}
            onSetGroupNote={handleSetGroupNote}
            onAddSubScene={handleAddSubScene}
            onRemoveSubScene={handleRemoveSubScene}
            onGenerateSubScene={handleGenerateSubScene}
            onReviseSubScene={handleReviseSubScene}
            onRefreshSubScene={(sceneId, subSceneId) => handleGenerateSubScene(sceneId, subSceneId)}
            onDeleteSubScenePrompt={handleDeleteSubScenePrompt}
            onSetSubSceneNote={handleSetSubSceneNote}
            onAddSubSceneToGroup={handleAddSubSceneToGroup}
            onRemoveSubSceneFromGroup={handleRemoveSubSceneFromGroup}
            onReorderScenes={(reordered) => dispatch({ type: 'REORDER_SCENES', payload: reordered })}
            sceneCards={state.sceneCards}
            characters={state.characters}
            locations={state.locations}
            isGeneratingPrompts={state.isGeneratingPrompts}
            onGeneratePrompts={handleGeneratePromptsForScene}
            onGenerateAllPrompts={handleGenerateAllPrompts}
            onDeleteSceneCard={id => dispatch({ type: 'DELETE_SCENE_CARD', payload: id })}
            onUpdateSceneCardNote={(sceneId, note) => dispatch({ type: 'UPDATE_SCENE_CARD_NOTE', payload: { sceneId, note } })}
            onRemoveCharacterFromSceneCard={(sceneId, characterId) => dispatch({ type: 'REMOVE_CHARACTER_FROM_SCENE_CARD', payload: { sceneId, characterId } })}
            onRemoveLocationFromSceneCard={(sceneId, locationId) => dispatch({ type: 'REMOVE_LOCATION_FROM_SCENE_CARD', payload: { sceneId, locationId } })}
            onAddCharacterToSceneCard={handleAddNewCharacterToSceneCard}
            onAddLocationToSceneCard={handleAddNewLocationToSceneCard}
          />
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKeys={state.apiKeys}
        imageApiKeys={state.imageApiKeys}
        settings={state.settings}
        onSaveKeys={keys => dispatch({ type: 'SET_API_KEYS', payload: keys })}
        onSaveImageKeys={keys => dispatch({ type: 'SET_IMAGE_API_KEYS', payload: keys })}
        onSaveSettings={s => dispatch({ type: 'SET_SETTINGS', payload: s })}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        scenes={state.scenes}
        consistencyGroups={state.consistencyGroups}
      />

      <InfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </div>
  );
};

export default Index;

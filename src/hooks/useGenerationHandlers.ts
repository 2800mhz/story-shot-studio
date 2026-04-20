import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { aiProvider } from '@/lib/aiProvider';
import { analyzeReferenceImage } from '@/lib/referenceAnalyzer';
import {
  analyzeTextIntoScenes,
  generateEpisodePrompt,
  generateEpisodePromptTurkishExplanation,
  reviseEpisodePrompt,
} from '@/lib/sceneAnalyzer';
import {
  autoSelectBestPrompt,
  generatePromptsForScene,
  revisePrompt,
} from '@/lib/promptGenerator';
import {
  setPinnedPrompt,
  updateReferenceAssignments,
  upsertGlobalCharacter,
  upsertGlobalLocation,
} from '@/lib/supabaseQueries';
import type { AppAction, AppState, EpisodeStyleVersion, PromptCard } from '@/types';
import type { HistoryEntry } from '@/components/PromptHistoryModal';

const WORKER_COUNT = 3;

interface UseGenerationHandlersParams {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  toast: (options: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  projectId?: string;
  setNoKeysWarning: Dispatch<SetStateAction<boolean>>;
}

export function useGenerationHandlers({
  state,
  dispatch,
  toast,
  aspectRatio,
  projectId,
  setNoKeysWarning,
}: UseGenerationHandlersParams) {
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [isRevisingEpisodeStyle, setIsRevisingEpisodeStyle] = useState(false);
  const [isBulkGeneratingPrompts, setIsBulkGeneratingPrompts] = useState(false);
  const [bulkPromptsProgress, setBulkPromptsProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const bulkPromptsAbortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleAnalyzeText = useCallback(async (selectedText: string, targetSceneCount?: number) => {
    dispatch({ type: 'START_ANALYSIS' });
    setAnalysisLog([]);

    try {
      const result = await analyzeTextIntoScenes(
        selectedText,
        undefined,
        undefined,
        (message: string) => {
          setAnalysisLog(prev => [...prev, message]);
        },
        targetSceneCount,
      );
      dispatch({ type: 'FINISH_ANALYSIS', payload: result });

      if (state.references.length > 0) {
        setAnalysisLog(prev => [...prev, '🖼️ Referanslar sahnelere atanıyor...']);
        try {
          for (const ref of state.references) {
            const base64Response = await fetch(ref.fileUrl);
            const blob = await base64Response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(blob);
            });

            const { assignedSceneIds, aiAnalysis } = await analyzeReferenceImage(
              base64,
              blob.type,
              ref.description || '',
              ref.referenceType,
              result.sceneCards,
            );

            dispatch({ type: 'UPDATE_REFERENCE', payload: { ...ref, assignedSceneIds, aiAnalysis } });
            await updateReferenceAssignments(ref.id, assignedSceneIds);
          }
          setAnalysisLog(prev => [...prev, `✅ ${state.references.length} referans sahnelere atandı`]);
        } catch {
          // noop
        }
      }

      try {
        setAnalysisLog(prev => [...prev, '🎨 Bölüm stili (episode prompt) üretiliyor...']);
        const episodePrompt = await generateEpisodePrompt(selectedText, result.characters, result.locations);
        if (episodePrompt) {
          dispatch({ type: 'SET_EPISODE_PROMPT', payload: episodePrompt });
          setAnalysisLog(prev => [...prev, '🇹🇷 Bölüm stili Türkçe özeti yazılıyor...']);
          const tr = await generateEpisodePromptTurkishExplanation(episodePrompt);
          if (tr) {
            dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: tr });
          }
        }
      } catch {
        toast({
          title: 'Stil Rehberi Hatası',
          description: 'Görsel stil rehberi üretilemedi ama analiz tamamlandı.',
          variant: 'destructive',
        });
      }

      setTimeout(() => setAnalysisLog([]), 3000);
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze text',
        variant: 'destructive',
      });
      dispatch({ type: 'FINISH_ANALYSIS', payload: { sceneCards: [], characters: [], locations: [] } });
    }
  }, [dispatch, state.references, toast]);

  const handleGeneratePromptsForScene = useCallback(async (sceneId: string, isRegeneration = false): Promise<boolean> => {
    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);
    if (!scene) return false;

    const sceneCharacters = stateRef.current.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = stateRef.current.locations.filter(l => scene.locationIds.includes(l.id));
    const sceneTimeContexts = stateRef.current.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));

    dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

    try {
      const result = await generatePromptsForScene(
        scene,
        sceneCharacters,
        sceneLocations,
        stateRef.current.masterPrompt,
        undefined,
        undefined,
        aspectRatio,
        undefined,
        sceneTimeContexts,
        stateRef.current.episodePrompt || undefined,
        stateRef.current.references,
        isRegeneration ? 'regenerate' : 'initial',
      );

      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: {
          sceneId,
          prompts: result.prompts,
          analysis: result.analysis,
          optimizations: result.optimizations,
        },
      });

      if (result.prompts.length > 1) {
        try {
          const { selectedIndex } = await autoSelectBestPrompt(
            result.prompts,
            scene.text || '',
            scene.visualNote || '',
          );
          const bestPrompt = result.prompts[selectedIndex];
          if (bestPrompt) {
            dispatch({ type: 'SET_PINNED_PROMPT', payload: { sceneId, promptId: bestPrompt.id, byAI: true } });
            void setPinnedPrompt(sceneId, bestPrompt.id);
          }
        } catch {
          // noop
        }
      }

      return true;
    } catch {
      dispatch({ type: 'FINISH_PROMPT_GENERATION', payload: { sceneId, prompts: [] } });
      return false;
    }
  }, [aspectRatio, dispatch]);

  const handleGenerateAllPrompts = useCallback(async () => {
    if (isBulkGeneratingPrompts) return;

    const scenesWithoutPrompts = stateRef.current.sceneCards.filter(
      s => s.prompts.length === 0 && s.status !== 'generating',
    );
    if (scenesWithoutPrompts.length === 0) return;

    const controller = new AbortController();
    bulkPromptsAbortRef.current = controller;
    setIsBulkGeneratingPrompts(true);
    setBulkPromptsProgress({ done: 0, total: scenesWithoutPrompts.length });

    const queue = [...scenesWithoutPrompts];
    let done = 0;

    const worker = async () => {
      while (queue.length > 0 && !controller.signal.aborted) {
        const scene = queue.shift();
        if (!scene) break;
        const success = await handleGeneratePromptsForScene(scene.id);
        if (success) {
          done += 1;
          setBulkPromptsProgress({ done, total: scenesWithoutPrompts.length });
        }
        await new Promise(r => setTimeout(r, 200));
      }
    };

    try {
      await Promise.all(Array.from({ length: WORKER_COUNT }, () => worker()));
    } finally {
      setIsBulkGeneratingPrompts(false);
      bulkPromptsAbortRef.current = null;
      setBulkPromptsProgress({ done: 0, total: 0 });
    }
  }, [handleGeneratePromptsForScene, isBulkGeneratingPrompts]);

  const handleCancelBulkPrompts = useCallback(() => {
    bulkPromptsAbortRef.current?.abort();
  }, []);

  const handleRegenerateAllScenes = useCallback(async () => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    const sceneIds = stateRef.current.sceneCards.map(sc => sc.id);
    if (sceneIds.length === 0) {
      toast({ title: 'Sahne yok', description: 'Önce sahneleri analiz edin.' });
      return;
    }

    sceneIds.forEach(sceneId => {
      dispatch({ type: 'FINISH_PROMPT_GENERATION', payload: { sceneId, prompts: [] } });
    });

    setIsBulkGeneratingPrompts(true);
    const controller = new AbortController();
    bulkPromptsAbortRef.current = controller;
    setBulkPromptsProgress({ done: 0, total: sceneIds.length });

    let done = 0;
    for (const sceneId of sceneIds) {
      if (controller.signal.aborted) break;
      await handleGeneratePromptsForScene(sceneId, true);
      done += 1;
      setBulkPromptsProgress({ done, total: sceneIds.length });
      await new Promise(r => setTimeout(r, 200));
    }

    setIsBulkGeneratingPrompts(false);
    bulkPromptsAbortRef.current = null;
    setBulkPromptsProgress({ done: 0, total: 0 });
  }, [dispatch, handleGeneratePromptsForScene, setNoKeysWarning, toast]);

  const handleRegenerateAllPrompts = useCallback(async (sceneId: string) => {
    await handleGeneratePromptsForScene(sceneId, true);
  }, [handleGeneratePromptsForScene]);

  const handleAddVariation = useCallback(async (sceneId: string) => {
    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const sceneCharacters = stateRef.current.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = stateRef.current.locations.filter(l => scene.locationIds.includes(l.id));
    const sceneTimeContexts = stateRef.current.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));
    const existingPrompts = scene.prompts;

    dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

    try {
      const result = await generatePromptsForScene(
        scene,
        sceneCharacters,
        sceneLocations,
        stateRef.current.masterPrompt,
        undefined,
        undefined,
        aspectRatio,
        undefined,
        sceneTimeContexts,
        stateRef.current.episodePrompt || undefined,
        stateRef.current.references,
        'regenerate',
      );

      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [...existingPrompts, ...result.prompts] },
      });
    } catch {
      dispatch({ type: 'FINISH_PROMPT_GENERATION', payload: { sceneId, prompts: existingPrompts } });
    }
  }, [aspectRatio, dispatch]);

  const handleDeletePrompt = useCallback((sceneId: string, promptId: string) => {
    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;
    dispatch({
      type: 'FINISH_PROMPT_GENERATION',
      payload: { sceneId, prompts: scene.prompts.filter(p => p.id !== promptId) },
    });
  }, [dispatch]);

  const handleRestoreSceneCardPrompt = useCallback((sceneId: string, entry: HistoryEntry) => {
    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const restoredPrompt: PromptCard = {
      id: crypto.randomUUID(),
      shotType: entry.shot_type || 'establishing',
      promptText: entry.prompt_text || '',
      summary: entry.summary || 'Önceki versiyondan geri yüklendi',
      explanation: entry.explanation || '',
      aspectRatio: entry.aspect_ratio || '16:9',
      label: entry.label || undefined,
      generationType: 'initial',
      versions: [],
    };

    const existingIdx = scene.prompts.findIndex(
      p => p.shotType === restoredPrompt.shotType && (p.label || '') === (restoredPrompt.label || ''),
    );

    const updatedPrompts = existingIdx === -1
      ? [...scene.prompts, restoredPrompt]
      : scene.prompts.map((p, i) => i === existingIdx ? restoredPrompt : p);

    dispatch({
      type: 'FINISH_PROMPT_GENERATION',
      payload: { sceneId, prompts: updatedPrompts },
    });
    toast({ title: 'Geri Yüklendi', description: 'Önceki prompt versiyonu başarıyla geri yüklendi.' });
  }, [dispatch, toast]);

  const handleRevisePrompt = useCallback(async (sceneId: string, promptId: string, instruction: string) => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    const scene = stateRef.current.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;
    const promptToRevise = scene.prompts.find(p => p.id === promptId);
    if (!promptToRevise) return;

    try {
      const revisedText = await revisePrompt(
        promptToRevise.promptText,
        instruction,
        '',
        stateRef.current.settings.model,
        stateRef.current.settings.temperature,
      );

      const updatedPrompt: PromptCard = {
        ...promptToRevise,
        id: crypto.randomUUID(),
        promptText: revisedText,
        versions: [...promptToRevise.versions, revisedText],
        generationType: 'revision',
        revisionPrompt: instruction,
      };

      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: {
          sceneId,
          prompts: scene.prompts.map(p => p.id === promptId ? updatedPrompt : p),
        },
      });
      toast({ title: 'Başarılı', description: 'Prompt başarıyla revize edildi.' });
    } catch {
      toast({ title: 'Hata', description: 'Prompt revize edilemedi.', variant: 'destructive' });
    }
  }, [dispatch, setNoKeysWarning, toast]);

  const handleSetPinnedPrompt = useCallback(async (sceneId: string, promptId: string) => {
    dispatch({ type: 'SET_PINNED_PROMPT', payload: { sceneId, promptId, byAI: false } });
    try {
      await setPinnedPrompt(sceneId, promptId);
    } catch {
      toast({ title: 'Hata', description: 'Raptiye kaydedilemedi.', variant: 'destructive' });
    }
  }, [dispatch, toast]);

  const handleAddNewCharacterToSceneCard = useCallback((sceneId: string, name: string) => {
    const character = {
      id: `char-${crypto.randomUUID()}`,
      name,
      description: '',
    };
    dispatch({ type: 'ADD_NEW_CHARACTER_TO_SCENE_CARD', payload: { sceneId, character } });

    if (projectId) {
      void upsertGlobalCharacter(projectId, { name, description: '' });
    }
  }, [dispatch, projectId]);

  const handleAddNewLocationToSceneCard = useCallback((sceneId: string, name: string) => {
    const location = {
      id: `loc-${crypto.randomUUID()}`,
      name,
      description: '',
    };
    dispatch({ type: 'ADD_NEW_LOCATION_TO_SCENE_CARD', payload: { sceneId, location } });

    if (projectId) {
      void upsertGlobalLocation(projectId, { name, description: '' });
    }
  }, [dispatch, projectId]);

  const handleReviseEpisodeStyle = useCallback(async (instruction: string) => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    if (stateRef.current.episodePrompt) {
      const snapshot: EpisodeStyleVersion = {
        id: crypto.randomUUID(),
        prompt: stateRef.current.episodePrompt,
        promptTr: stateRef.current.episodePromptTr,
        instruction,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_EPISODE_STYLE_VERSION', payload: snapshot });
    }

    setIsRevisingEpisodeStyle(true);
    try {
      const revised = await reviseEpisodePrompt(stateRef.current.episodePrompt, instruction);
      dispatch({ type: 'SET_EPISODE_PROMPT', payload: revised });
      const tr = await generateEpisodePromptTurkishExplanation(revised);
      dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: tr });
      toast({ title: '✨ Bölüm stili oluşturuldu', description: 'Türkçe özet de yenilendi.' });
    } catch (err) {
      toast({
        title: 'Oluşturma başarısız',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        variant: 'destructive',
      });
    } finally {
      setIsRevisingEpisodeStyle(false);
    }
  }, [dispatch, setNoKeysWarning, toast]);

  return {
    analysisLog,
    isRevisingEpisodeStyle,
    isBulkGeneratingPrompts,
    bulkPromptsProgress,
    handleAnalyzeText,
    handleGeneratePromptsForScene,
    handleGenerateAllPrompts,
    handleCancelBulkPrompts,
    handleRegenerateAllScenes,
    handleRegenerateAllPrompts,
    handleAddVariation,
    handleDeletePrompt,
    handleRestoreSceneCardPrompt,
    handleRevisePrompt,
    handleSetPinnedPrompt,
    handleAddNewCharacterToSceneCard,
    handleAddNewLocationToSceneCard,
    handleReviseEpisodeStyle,
  };
}

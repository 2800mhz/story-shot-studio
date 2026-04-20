import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppAction, AppState } from '@/types';
import { generatePromptsForScene, autoSelectBestPrompt } from '@/lib/promptGenerator';
import { setPinnedPrompt } from '@/lib/supabaseQueries';
import { aiProvider } from '@/lib/aiProvider';

interface UseGenerationHandlersArgs {
  state: AppState;
  dispatch: (action: AppAction) => void;
  aspectRatio: '16:9' | '4:3' | '1:1' | '9:16';
  onMissingApiKeys: () => void;
  toast: (args: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
}

const WORKER_COUNT = 3;

export function useGenerationHandlers({ state, dispatch, aspectRatio, onMissingApiKeys, toast }: UseGenerationHandlersArgs) {
  const [isBulkGeneratingPrompts, setIsBulkGeneratingPrompts] = useState(false);
  const [bulkPromptsProgress, setBulkPromptsProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const bulkPromptsAbortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
        stateRef.current.sceneAnalyses[sceneId],
        sceneTimeContexts,
        stateRef.current.episodePrompt || undefined,
        stateRef.current.references,
        isRegeneration ? 'regenerate' : 'initial',
        () => {
          toast({
            title: '⚠️ Yapay Zeka Yanıtı Onarılıyor',
            description: 'Yapay zeka yanıtı bozuk geldi, otomatik onarım deneniyor...',
          });
        },
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
          const sceneForPin = stateRef.current.sceneCards.find(s => s.id === sceneId);
          const { selectedIndex } = await autoSelectBestPrompt(
            result.prompts,
            sceneForPin?.text || '',
            sceneForPin?.visualNote || '',
          );
          const bestPrompt = result.prompts[selectedIndex];
          if (bestPrompt) {
            dispatch({ type: 'SET_PINNED_PROMPT', payload: { sceneId, promptId: bestPrompt.id, byAI: true } });
            setPinnedPrompt(sceneId, bestPrompt.id).catch(() => undefined);
          }
        } catch {
          // no-op
        }
      }

      return true;
    } catch {
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [] },
      });
      return false;
    }
  }, [aspectRatio, dispatch, toast]);

  const handleGenerateAllPrompts = useCallback(async () => {
    if (isBulkGeneratingPrompts) return;

    const scenesWithoutPrompts = stateRef.current.sceneCards.filter(s => s.prompts.length === 0 && s.status !== 'generating');
    if (scenesWithoutPrompts.length === 0) return;

    const controller = new AbortController();
    bulkPromptsAbortRef.current = controller;
    setIsBulkGeneratingPrompts(true);
    setBulkPromptsProgress({ done: 0, total: scenesWithoutPrompts.length });

    const queue = [...scenesWithoutPrompts];
    const failedScenes: typeof scenesWithoutPrompts = [];
    let done = 0;
    let consecutiveFailures = 0;

    const processScene = async (scene: typeof scenesWithoutPrompts[0]): Promise<void> => {
      if (controller.signal.aborted) return;

      const success = await handleGeneratePromptsForScene(scene.id);

      if (success) {
        done++;
        consecutiveFailures = 0;
        setBulkPromptsProgress({ done, total: scenesWithoutPrompts.length });
      } else {
        consecutiveFailures++;
        failedScenes.push(scene);

        if (consecutiveFailures >= 5) {
          toast({
            title: '⚠️ Rate limit — 10sn bekleniyor...',
            description: 'Tüm API anahtarları geçici olarak limit yedi.',
          });
          await new Promise(r => setTimeout(r, 10000));
          consecutiveFailures = 0;
        }
      }
    };

    const worker = async (): Promise<void> => {
      while (queue.length > 0 && !controller.signal.aborted) {
        const scene = queue.shift();
        if (!scene) break;
        await processScene(scene);
        await new Promise(r => setTimeout(r, 200));
      }
    };

    try {
      await Promise.all(Array.from({ length: WORKER_COUNT }, () => worker()));

      if (failedScenes.length > 0 && !controller.signal.aborted) {
        toast({ title: `🔄 ${failedScenes.length} sahne yeniden deneniyor...` });
        await new Promise(r => setTimeout(r, 5000));
        for (const scene of failedScenes) {
          if (controller.signal.aborted) break;
          await processScene(scene);
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } finally {
      setIsBulkGeneratingPrompts(false);
      bulkPromptsAbortRef.current = null;
      setBulkPromptsProgress({ done: 0, total: 0 });

      const stillFailed = failedScenes.filter(s => stateRef.current.sceneCards.find(sc => sc.id === s.id)?.prompts.length === 0);
      if (stillFailed.length > 0) {
        toast({
          title: `❌ ${stillFailed.length} sahne üretilemedi`,
          description: 'Manuel olarak tekrar deneyebilirsiniz.',
          variant: 'destructive',
        });
      }
    }
  }, [handleGeneratePromptsForScene, isBulkGeneratingPrompts, toast]);

  const handleCancelBulkPrompts = useCallback(() => {
    bulkPromptsAbortRef.current?.abort();
  }, []);

  const handleRegenerateAllScenes = useCallback(async () => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      onMissingApiKeys();
      return;
    }

    const sceneIds = stateRef.current.sceneCards.map(sc => sc.id);
    if (sceneIds.length === 0) {
      toast({ title: 'Sahne yok', description: 'Önce sahneleri analiz edin.' });
      return;
    }

    sceneIds.forEach(sceneId => {
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [] },
      });
    });

    setIsBulkGeneratingPrompts(true);
    const controller = new AbortController();
    bulkPromptsAbortRef.current = controller;
    setBulkPromptsProgress({ done: 0, total: sceneIds.length });

    let done = 0;
    for (const sceneId of sceneIds) {
      if (controller.signal.aborted) break;
      await handleGeneratePromptsForScene(sceneId, true);
      done++;
      setBulkPromptsProgress({ done, total: sceneIds.length });
      await new Promise(r => setTimeout(r, 200));
    }

    setIsBulkGeneratingPrompts(false);
    bulkPromptsAbortRef.current = null;
    setBulkPromptsProgress({ done: 0, total: 0 });
  }, [dispatch, handleGeneratePromptsForScene, onMissingApiKeys, toast]);

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
        stateRef.current.sceneAnalyses[sceneId],
        sceneTimeContexts,
        stateRef.current.episodePrompt || undefined,
        stateRef.current.references,
        'regenerate',
        () => {
          toast({
            title: '⚠️ Yapay Zeka Yanıtı Onarılıyor',
            description: 'Yapay zeka yanıtı bozuk geldi, otomatik onarım deneniyor...',
          });
        },
      );

      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [...existingPrompts, ...result.prompts] },
      });
    } catch {
      dispatch({ type: 'FINISH_PROMPT_GENERATION', payload: { sceneId, prompts: existingPrompts } });
    }
  }, [aspectRatio, dispatch, toast]);

  return {
    isBulkGeneratingPrompts,
    bulkPromptsProgress,
    handleGeneratePromptsForScene,
    handleGenerateAllPrompts,
    handleCancelBulkPrompts,
    handleRegenerateAllScenes,
    handleRegenerateAllPrompts,
    handleAddVariation,
  };
}

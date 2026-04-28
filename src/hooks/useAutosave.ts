import { useState, useCallback, useRef, useEffect } from 'react';
import { saveScenes, updateEpisode, savePrompts } from '@/lib/supabaseQueries';

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export function useAutosave({
  episodeId,
  state,
  loadingData,
  episode,
  toast
}: {
  episodeId?: string;
  state: any;
  loadingData: boolean;
  episode: any;
  toast: any;
}) {
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const saveStateRef = useRef({
    sceneCards: state.sceneCards,
    timeContexts: state.timeContexts,
    episodePrompt: state.episodePrompt,
    episodePromptTr: state.episodePromptTr,
    episodeStyleHistory: state.episodeStyleHistory,
    documentText: state.documentText,
    characters: state.characters,
    locations: state.locations,
  });
  saveStateRef.current = {
    sceneCards: state.sceneCards,
    timeContexts: state.timeContexts,
    episodePrompt: state.episodePrompt,
    episodePromptTr: state.episodePromptTr,
    episodeStyleHistory: state.episodeStyleHistory,
    documentText: state.documentText,
    characters: state.characters,
    locations: state.locations,
  };

  const doSave = useCallback(async () => {
    if (!episodeId) return;
    const snap = saveStateRef.current;
    if (snap.sceneCards.length === 0) return;
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      console.log('⏳ Save already in progress, queuing…');
      return;
    }

    isSavingRef.current = true;
    pendingSaveRef.current = false;

    try {
      setSavingStatus('saving');
      console.log('💾 Auto-saving scenes + episode data...');

      await saveScenes(episodeId, snap.sceneCards);

      await updateEpisode(episodeId, {
        time_contexts: snap.timeContexts,
        episode_prompt: snap.episodePrompt || undefined,
        episode_prompt_tr: snap.episodePromptTr || undefined,
        episode_style_history: snap.episodeStyleHistory,
        document_text: snap.documentText || undefined,
        character_data: JSON.stringify(snap.characters),
        location_data: JSON.stringify(snap.locations),
      });

      const PROMPT_BATCH = 5;
      const scenesWithPrompts = snap.sceneCards.filter((scene: any) => scene.prompts.length > 0);

      let failedCount = 0;
      for (let i = 0; i < scenesWithPrompts.length; i += PROMPT_BATCH) {
        const batch = scenesWithPrompts.slice(i, i + PROMPT_BATCH);
        const results = await Promise.allSettled(
          batch.map((scene: any) => savePrompts(scene.id, scene.prompts))
        );
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            failedCount++;
            console.error(`❌ Failed to save prompts for scene ${batch[idx].id}:`, r.reason);
          }
        });
      }

      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount}/${scenesWithPrompts.length} prompt saves failed`);
        setSavingStatus('error');
        toast({
          title: "Kısmi kaydetme hatası",
          description: `${scenesWithPrompts.length - failedCount}/${scenesWithPrompts.length} sahne kaydedildi. ${failedCount} sahne başarısız.`,
          variant: "destructive"
        });
      } else {
        setSavingStatus('saved');
        setLastSavedAt(new Date());
        console.log('✅ Auto-save complete');
      }

      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ Error saving scenes:', error);
      setSavingStatus('error');
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        doSave();
      }
    }
  }, [episodeId, toast]);

  useEffect(() => {
    if (!loadingData && episode && episodeId) {
      const timeoutId = setTimeout(doSave, AUTO_SAVE_DEBOUNCE_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [
    state.sceneCards, state.timeContexts, state.episodePrompt, state.episodePromptTr,
    state.episodeStyleHistory, state.documentText, state.characters, state.locations,
    episodeId, loadingData, episode, doSave
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      doSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [doSave]);

  return {
    savingStatus,
    lastSavedAt,
    doSave
  };
}

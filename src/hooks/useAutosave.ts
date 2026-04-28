import { useState, useCallback, useRef, useEffect } from 'react';
import { saveScenes, updateEpisode, savePrompts } from '@/lib/supabaseQueries';

const AUTO_SAVE_DEBOUNCE_MS = 5000;

function stableStringify(value: unknown): string {
  // Fast-enough deterministic stringify for dirty checks.
  // We don't need cryptographic hashing here.
  return JSON.stringify(value);
}

function fingerprintScenePrompts(scene: any): string {
  const prompts = Array.isArray(scene?.prompts) ? scene.prompts : [];
  // Only include fields that affect persistence & UX.
  const minimal = prompts.map((p: any) => ({
    id: p.id,
    promptText: p.promptText,
    shotType: p.shotType,
    label: p.label,
    isPinned: !!p.isPinned,
    isPinnedByAI: !!p.isPinnedByAI,
    isStale: !!p.isStale,
    staleReason: p.staleReason ?? null,
    // versions can be large; include length + last entry as a cheap change signal
    versionsLen: Array.isArray(p.versions) ? p.versions.length : 0,
    versionsLast: Array.isArray(p.versions) && p.versions.length > 0 ? p.versions[p.versions.length - 1] : null,
  }));
  return stableStringify(minimal);
}

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
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const lastSavedPromptFingerprintsRef = useRef<Map<string, string>>(new Map());

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

    // Dirty-check: avoid saving when nothing materially changed.
    const fingerprint = stableStringify({
      sceneCards: snap.sceneCards.map((s: any) => ({
        id: s.id,
        sceneNumber: s.sceneNumber,
        text: s.text,
        visualNote: s.visualNote,
        visualStyle: s.visualStyle ?? null,
        narrativeLayer: s.narrativeLayer ?? null,
        characterIds: s.characterIds,
        locationIds: s.locationIds,
        timeContextIds: s.timeContextIds,
        status: s.status,
        noteEditable: s.noteEditable,
        promptsNeedRefresh: !!s.promptsNeedRefresh,
        staleReasons: s.staleReasons ?? [],
        promptsCount: Array.isArray(s.prompts) ? s.prompts.length : 0,
        // prompt contents are handled separately per-scene below
      })),
      timeContexts: snap.timeContexts,
      episodePrompt: snap.episodePrompt ?? '',
      episodePromptTr: snap.episodePromptTr ?? '',
      episodeStyleHistoryLen: Array.isArray(snap.episodeStyleHistory) ? snap.episodeStyleHistory.length : 0,
      documentTextLen: typeof snap.documentText === 'string' ? snap.documentText.length : 0,
      characters: snap.characters,
      locations: snap.locations,
    });

    if (lastSavedFingerprintRef.current === fingerprint) {
      // Still might need to save prompts if they changed, but if sceneCards metadata didn't change
      // and prompt fingerprints didn't change, skip entirely.
      let anyPromptDirty = false;
      for (const scene of snap.sceneCards) {
        const nextFp = fingerprintScenePrompts(scene);
        const prevFp = lastSavedPromptFingerprintsRef.current.get(scene.id);
        if (prevFp !== nextFp) { anyPromptDirty = true; break; }
      }
      if (!anyPromptDirty) return;
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
      const dirtyPromptScenes = scenesWithPrompts.filter((scene: any) => {
        const nextFp = fingerprintScenePrompts(scene);
        const prevFp = lastSavedPromptFingerprintsRef.current.get(scene.id);
        return prevFp !== nextFp;
      });

      let failedCount = 0;
      for (let i = 0; i < dirtyPromptScenes.length; i += PROMPT_BATCH) {
        const batch = dirtyPromptScenes.slice(i, i + PROMPT_BATCH);
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
        console.warn(`⚠️ ${failedCount}/${dirtyPromptScenes.length} prompt saves failed`);
        setSavingStatus('error');
        toast({
          title: "Kısmi kaydetme hatası",
          description: `${dirtyPromptScenes.length - failedCount}/${dirtyPromptScenes.length} sahne kaydedildi. ${failedCount} sahne başarısız.`,
          variant: "destructive"
        });
      } else {
        setSavingStatus('saved');
        setLastSavedAt(new Date());
        lastSavedFingerprintRef.current = fingerprint;
        // Update per-scene prompt fingerprints after a successful save.
        for (const scene of scenesWithPrompts) {
          lastSavedPromptFingerprintsRef.current.set(scene.id, fingerprintScenePrompts(scene));
        }
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
      // Avoid autosave churn while generators are actively running.
      // (Agent streaming doesn't touch app state much, but prompt generation does.)
      if (state.isGeneratingPrompts) return;
      const timeoutId = setTimeout(doSave, AUTO_SAVE_DEBOUNCE_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [
    state.sceneCards, state.timeContexts, state.episodePrompt, state.episodePromptTr,
    state.episodeStyleHistory, state.documentText, state.characters, state.locations,
    state.isGeneratingPrompts,
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

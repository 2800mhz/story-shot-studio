import { useCallback, useEffect, useRef, useState } from 'react';
import { parseEpisodes } from '@/lib/contextDetection';
import {
  fetchAllPromptsForScenes,
  fetchEpisode,
  fetchGlobalCharacters,
  fetchGlobalLocations,
  fetchProject,
  fetchReferences,
  fetchScenes,
  savePrompts,
  saveScenes,
  updateEpisode,
} from '@/lib/supabaseQueries';
import type { AppAction, AppState, EpisodeStyleVersion, PromptCard } from '@/types';

const AUTO_SAVE_DEBOUNCE_MS = 2000;
const DEFAULT_VISUAL_STYLE = 'realistic' as const;
const DEFAULT_NARRATIVE_LAYER = 'historical' as const;

function stripHtmlToText(input: string): string {
  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(input, 'text/html');
    return parsed.body.textContent || '';
  }
  console.warn('DOMParser unavailable; falling back to raw document text for episode parsing.');
  return input;
}

interface UseEpisodeDataArgs {
  projectId?: string;
  episodeId?: string;
  state: AppState;
  dispatch: (action: AppAction) => void;
  toast: (args: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

type ProjectData = { title: string; master_prompt?: string };
type EpisodeData = { title: string; document_text?: string };
type SceneRow = {
  id: string;
  scene_number: number;
  text: string;
  visual_note?: string | null;
  visual_style?: string | null;
  narrative_layer?: string | null;
  character_ids?: string[] | null;
  location_ids?: string[] | null;
  time_context_ids?: string[] | null;
  start_index?: number | null;
  end_index?: number | null;
  analysis?: unknown;
  optimizations?: string[] | null;
};
type PromptRow = {
  id: string;
  type?: 'wide' | 'medium' | 'closeup' | null;
  label?: string | null;
  shot_type: string;
  summary?: string | null;
  explanation?: string | null;
  prompt_text: string;
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '9:16' | null;
  is_pinned?: boolean | null;
};

export function useEpisodeData({ projectId, episodeId, state, dispatch, toast }: UseEpisodeDataArgs) {
  const [loadingData, setLoadingData] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [episode, setEpisode] = useState<EpisodeData | null>(null);

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

  const loadEpisodeData = useCallback(async () => {
    if (!projectId || !episodeId) return;
    setLoadingData(true);
    try {
      const [projectData, episodeData, scenesData, globalChars, globalLocs, referencesData] = await Promise.all([
        fetchProject(projectId),
        fetchEpisode(episodeId),
        fetchScenes(episodeId),
        fetchGlobalCharacters(projectId),
        fetchGlobalLocations(projectId),
        fetchReferences(episodeId),
      ]);

      setProject(projectData);
      setEpisode(episodeData);
      dispatch({ type: 'SET_REFERENCES', payload: referencesData || [] });

      if (projectData.master_prompt) {
        dispatch({ type: 'SET_MASTER_PROMPT', payload: projectData.master_prompt });
      }

      if (episodeData.document_text) {
        dispatch({ type: 'SET_DOCUMENT_TEXT', payload: episodeData.document_text });
        const plainText = stripHtmlToText(episodeData.document_text);
        dispatch({ type: 'SET_EPISODES', payload: parseEpisodes(plainText) });
      }

      dispatch({ type: 'SET_EPISODE_PROMPT', payload: episodeData.episode_prompt || '' });
      dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: episodeData.episode_prompt_tr || '' });

      if (Array.isArray(episodeData.episode_style_history) && episodeData.episode_style_history.length > 0) {
        dispatch({ type: 'SET_EPISODE_STYLE_HISTORY', payload: episodeData.episode_style_history as EpisodeStyleVersion[] });
      } else {
        dispatch({ type: 'SET_EPISODE_STYLE_HISTORY', payload: [] });
      }

      if (episodeData.character_data) {
        try {
          dispatch({ type: 'SET_CHARACTERS', payload: JSON.parse(episodeData.character_data) });
        } catch {
          if (globalChars.length > 0) {
            dispatch({
              type: 'SET_CHARACTERS',
              payload: globalChars.map((c: { id: string; name: string; role?: string | null; is_crowd?: boolean | null; visual_description?: string | null }) => ({
                id: c.id,
                name: c.name,
                role: c.role || undefined,
                isCrowd: c.is_crowd ?? false,
                visualDescription: c.visual_description || undefined,
              })),
            });
          }
        }
      } else if (globalChars.length > 0) {
        dispatch({
          type: 'SET_CHARACTERS',
          payload: globalChars.map((c: { id: string; name: string; role?: string | null; is_crowd?: boolean | null; visual_description?: string | null }) => ({
            id: c.id,
            name: c.name,
            role: c.role || undefined,
            isCrowd: c.is_crowd ?? false,
            visualDescription: c.visual_description || undefined,
          })),
        });
      }

      if (episodeData.location_data) {
        try {
          dispatch({ type: 'SET_LOCATIONS', payload: JSON.parse(episodeData.location_data) });
        } catch {
          if (globalLocs.length > 0) {
            dispatch({
              type: 'SET_LOCATIONS',
              payload: globalLocs.map((l: { id: string; name: string; visual_description?: string | null }) => ({
                id: l.id,
                name: l.name,
                visualDescription: l.visual_description || undefined,
              })),
            });
          }
        }
      } else if (globalLocs.length > 0) {
        dispatch({
          type: 'SET_LOCATIONS',
          payload: globalLocs.map((l: { id: string; name: string; visual_description?: string | null }) => ({
            id: l.id,
            name: l.name,
            visualDescription: l.visual_description || undefined,
          })),
        });
      }

      if (scenesData.length > 0) {
        const mappedScenes = (scenesData as SceneRow[]).map((scene) => ({
          id: scene.id,
          sceneNumber: scene.scene_number,
          text: scene.text,
          visualNote: scene.visual_note || '',
          visualStyle: scene.visual_style || DEFAULT_VISUAL_STYLE,
          narrativeLayer: scene.narrative_layer || DEFAULT_NARRATIVE_LAYER,
          characterIds: scene.character_ids || [],
          locationIds: scene.location_ids || [],
          timeContextIds: scene.time_context_ids || [],
          startIndex: scene.start_index ?? undefined,
          endIndex: scene.end_index ?? undefined,
          prompts: [],
          status: 'ready' as const,
          noteEditable: false,
          analysis: scene.analysis,
          optimizations: scene.optimizations || [],
        }));

        dispatch({ type: 'SET_SCENES', payload: mappedScenes });

        const promptsByScene = await fetchAllPromptsForScenes(scenesData.map(s => s.id));
        const allMappedPrompts: Record<string, PromptCard[]> = {};

        promptsByScene.forEach((prompts, sceneId) => {
          if (prompts.length > 0) {
            allMappedPrompts[sceneId] = (prompts as PromptRow[]).map((p) => ({
              id: p.id,
              type: p.type,
              label: p.label,
              shotType: p.shot_type,
              summary: p.summary,
              explanation: p.explanation,
              promptText: p.prompt_text,
              aspectRatio: p.aspect_ratio,
              versions: [p.prompt_text],
              isPinned: p.is_pinned ?? false,
              isPinnedByAI: false,
            }));
          }
        });

        if (Object.keys(allMappedPrompts).length > 0) {
          dispatch({ type: 'SET_ALL_PROMPTS', payload: allMappedPrompts });
        }
      }

      const storedTimeContexts = Array.isArray(episodeData.time_contexts) && episodeData.time_contexts.length > 0
        ? episodeData.time_contexts
        : null;
      if (storedTimeContexts) {
        dispatch({ type: 'SET_TIME_CONTEXTS', payload: storedTimeContexts });
      }
    } catch (error) {
      toast({
        title: 'Error loading episode',
        description: error instanceof Error ? error.message : 'Failed to load episode data',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  }, [dispatch, episodeId, projectId, toast]);

  const doSave = useCallback(async () => {
    if (!episodeId) return;
    const snap = saveStateRef.current;
    if (snap.sceneCards.length === 0) return;
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    pendingSaveRef.current = false;

    try {
      setSavingStatus('saving');
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

      const scenesWithPrompts = snap.sceneCards.filter(scene => scene.prompts.length > 0);
      const PROMPT_BATCH = 5;
      let failedCount = 0;

      for (let i = 0; i < scenesWithPrompts.length; i += PROMPT_BATCH) {
        const batch = scenesWithPrompts.slice(i, i + PROMPT_BATCH);
        const results = await Promise.allSettled(batch.map(scene => savePrompts(scene.id, scene.prompts)));
        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            failedCount++;
            console.error(`Prompt save failed for scene ${batch[idx].id}:`, result.reason);
          }
        });
      }

      if (failedCount > 0) {
        setSavingStatus('error');
        toast({
          title: 'Kısmi kaydetme hatası',
          description: `${scenesWithPrompts.length - failedCount}/${scenesWithPrompts.length} sahne kaydedildi. ${failedCount} sahne başarısız.`,
          variant: 'destructive',
        });
      } else {
        setSavingStatus('saved');
        setLastSavedAt(new Date());
      }

      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch (error) {
      setSavingStatus('error');
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: 'destructive',
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
    if (projectId && episodeId) {
      loadEpisodeData();
    }
  }, [episodeId, loadEpisodeData, projectId]);

  useEffect(() => {
    if (!loadingData && episode && episodeId) {
      const timeoutId = setTimeout(doSave, AUTO_SAVE_DEBOUNCE_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [
    doSave,
    episode,
    episodeId,
    loadingData,
    state.sceneCards,
    state.timeContexts,
    state.episodePrompt,
    state.episodePromptTr,
    state.episodeStyleHistory,
    state.documentText,
    state.characters,
    state.locations,
  ]);

  return {
    loadingData,
    savingStatus,
    lastSavedAt,
    project,
    episode,
    doSave,
    loadEpisodeData,
  };
}

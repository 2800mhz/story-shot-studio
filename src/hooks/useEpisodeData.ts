import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { AppAction, AppState, EpisodeStyleVersion } from '@/types';

const AUTO_SAVE_DEBOUNCE_MS = 2000;

type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseEpisodeDataParams {
  projectId?: string;
  episodeId?: string;
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

interface SceneRow {
  id: string;
  scene_number: number;
  text: string;
  visual_note?: string | null;
  character_ids?: string[] | null;
  location_ids?: string[] | null;
  time_context_ids?: string[] | null;
  start_index?: number | null;
  end_index?: number | null;
  analysis?: import('@/types').PromptAnalysis;
  optimizations?: string[] | null;
  visual_style?: import('@/types').SceneCard['visualStyle'] | null;
  narrative_layer?: import('@/types').SceneCard['narrativeLayer'] | null;
}

interface PromptRow {
  id: string;
  type?: 'wide' | 'medium' | 'closeup' | null;
  label?: string | null;
  shot_type: string;
  summary: string;
  explanation?: string | null;
  prompt_text: string;
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '9:16' | null;
  is_pinned?: boolean | null;
  generation_type?: 'initial' | 'regenerate' | 'revision' | null;
  revision_prompt?: string | null;
}

export function useEpisodeData({ projectId, episodeId, state, dispatch }: UseEpisodeDataParams) {
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(false);
  const [savingStatus, setSavingStatus] = useState<SavingStatus>('idle');
  const [project, setProject] = useState<{ title: string; master_prompt?: string } | null>(null);
  const [episode, setEpisode] = useState<{ title: string; document_text?: string } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

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
        const plainText = episodeData.document_text.replace(/<[^>]+>/g, '');
        dispatch({ type: 'SET_EPISODES', payload: parseEpisodes(plainText) });
      }

      dispatch({ type: 'SET_EPISODE_PROMPT', payload: episodeData.episode_prompt || '' });
      dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: episodeData.episode_prompt_tr || '' });
      dispatch({
        type: 'SET_EPISODE_STYLE_HISTORY',
        payload: Array.isArray(episodeData.episode_style_history)
          ? (episodeData.episode_style_history as EpisodeStyleVersion[])
          : [],
      });

      if (episodeData.character_data) {
        try {
          dispatch({ type: 'SET_CHARACTERS', payload: JSON.parse(episodeData.character_data) });
        } catch {
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
      } else {
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
          dispatch({
            type: 'SET_LOCATIONS',
            payload: globalLocs.map((l: { id: string; name: string; visual_description?: string | null }) => ({
              id: l.id,
              name: l.name,
              visualDescription: l.visual_description || undefined,
            })),
          });
        }
      } else {
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
          visualStyle: scene.visual_style || undefined,
          narrativeLayer: scene.narrative_layer || undefined,
        }));
        dispatch({ type: 'SET_SCENES', payload: mappedScenes });

        const promptsByScene = await fetchAllPromptsForScenes(scenesData.map(s => s.id));
        const allMappedPrompts: Record<string, import('@/types').PromptCard[]> = {};

        promptsByScene.forEach((prompts, sceneId) => {
          if (!prompts.length) return;
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
            generationType: p.generation_type || 'initial',
            revisionPrompt: p.revision_prompt || undefined,
          }));
        });

        if (Object.keys(allMappedPrompts).length > 0) {
          dispatch({ type: 'SET_ALL_PROMPTS', payload: allMappedPrompts });
        }
      }

      if (Array.isArray(episodeData.time_contexts) && episodeData.time_contexts.length > 0) {
        dispatch({ type: 'SET_TIME_CONTEXTS', payload: episodeData.time_contexts });
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

  useEffect(() => {
    loadEpisodeData();
  }, [loadEpisodeData]);

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

      const PROMPT_BATCH = 5;
      const scenesWithPrompts = snap.sceneCards.filter(scene => scene.prompts.length > 0);
      let failedCount = 0;

      for (let i = 0; i < scenesWithPrompts.length; i += PROMPT_BATCH) {
        const batch = scenesWithPrompts.slice(i, i + PROMPT_BATCH);
        const results = await Promise.allSettled(batch.map(scene => savePrompts(scene.id, scene.prompts)));
        results.forEach(result => {
          if (result.status === 'rejected') failedCount += 1;
        });
      }

      if (failedCount > 0) {
        setSavingStatus('error');
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
        void doSave();
      }
    }
  }, [episodeId, toast]);

  useEffect(() => {
    if (!loadingData && episode && episodeId) {
      const timeoutId = setTimeout(doSave, AUTO_SAVE_DEBOUNCE_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [
    state.sceneCards,
    state.timeContexts,
    state.episodePrompt,
    state.episodePromptTr,
    state.episodeStyleHistory,
    state.documentText,
    state.characters,
    state.locations,
    episode,
    episodeId,
    loadingData,
    doSave,
  ]);

  return {
    loadingData,
    savingStatus,
    project,
    episode,
    lastSavedAt,
    doSave,
  };
}

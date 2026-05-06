import { useState, useCallback } from 'react';
import { parseEpisodes } from '@/lib/episodeParser';
import { 
  fetchProject, fetchEpisode, fetchScenes, fetchAllPromptsForScenes, 
  fetchGlobalCharacters, fetchGlobalLocations, fetchReferences 
} from '@/lib/supabaseQueries';
import { ProjectType, EpisodeStyleVersion } from '@/types';
import { loadEpisodePreferences } from '@/lib/episodePreferences';

export function useEpisodeWorkspace({ 
  projectId, 
  episodeId, 
  dispatch, 
  toast 
}: { 
  projectId?: string; 
  episodeId?: string; 
  dispatch: any; 
  toast: any; 
}) {
  const [loadingData, setLoadingData] = useState(false);
  const [project, setProject] = useState<{ title: string; master_prompt?: string; project_type?: ProjectType } | null>(null);
  const [episode, setEpisode] = useState<{ title: string; document_text?: string } | null>(null);

  const loadEpisodeData = useCallback(async () => {
    if (!projectId || !episodeId) return;

    setLoadingData(true);
    try {
      console.log('📥 Loading episode data:', episodeId);

      const [projectData, episodeData, scenesData, globalChars, globalLocs, referencesData] = await Promise.all([
        fetchProject(projectId),
        fetchEpisode(episodeId),
        fetchScenes(episodeId),
        fetchGlobalCharacters(projectId),
        fetchGlobalLocations(projectId),
        fetchReferences(episodeId)
      ]);

      console.log('✅ Loaded:', {
        project: projectData.title,
        episode: episodeData.title,
        scenes: scenesData.length
      });

      setProject(projectData);
      const episodePreferences = loadEpisodePreferences(episodeId);
      dispatch({
        type: 'SET_PROJECT_TYPE',
        payload: episodePreferences?.projectType || (projectData.project_type as ProjectType) || 'documentary'
      });
      dispatch({
        type: 'SET_RENDER_MODE',
        payload: episodePreferences?.renderMode || 'photoreal'
      });
      setEpisode(episodeData);

      console.log('📎 References from DB:', referencesData?.length, referencesData);
      dispatch({ type: 'SET_REFERENCES', payload: referencesData || [] });
      console.log('📎 SET_REFERENCES dispatched');

      if (projectData.master_prompt) {
        dispatch({ type: 'SET_MASTER_PROMPT', payload: projectData.master_prompt });
      }

      if (episodeData.document_text) {
        dispatch({ type: 'SET_DOCUMENT_TEXT', payload: episodeData.document_text });
        const plainText = episodeData.document_text.replace(/<[^>]+>/g, '');
        const derivedEpisodes = parseEpisodes(plainText);
        dispatch({ type: 'SET_EPISODES', payload: derivedEpisodes });
      }

      if (episodeData.episode_prompt) {
        dispatch({ type: 'SET_EPISODE_PROMPT', payload: episodeData.episode_prompt });
      } else {
        dispatch({ type: 'SET_EPISODE_PROMPT', payload: '' });
      }

      if (episodeData.episode_prompt_tr) {
        dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: episodeData.episode_prompt_tr });
      } else {
        dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: '' });
      }

      if (Array.isArray(episodeData.episode_style_history) && episodeData.episode_style_history.length > 0) {
        dispatch({ type: 'SET_EPISODE_STYLE_HISTORY', payload: episodeData.episode_style_history as EpisodeStyleVersion[] });
      } else {
        dispatch({ type: 'SET_EPISODE_STYLE_HISTORY', payload: [] });
      }

      if (episodeData.character_data) {
        try {
          dispatch({ type: 'SET_CHARACTERS', payload: JSON.parse(episodeData.character_data) });
        } catch (e) {
          console.warn('Failed to parse character_data, falling back to global characters:', e);
          if (globalChars.length > 0) {
            dispatch({
              type: 'SET_CHARACTERS',
              payload: globalChars.map((c: any) => ({
                id: c.id,
                name: c.name,
                role: c.role || undefined,
                isCrowd: c.is_crowd ?? false,
                visualDescription: c.visual_description || undefined,
              }))
            });
          }
        }
      } else if (globalChars.length > 0) {
        dispatch({
          type: 'SET_CHARACTERS',
          payload: globalChars.map((c: any) => ({
            id: c.id,
            name: c.name,
            role: c.role || undefined,
            isCrowd: c.is_crowd ?? false,
            visualDescription: c.visual_description || undefined,
          }))
        });
      }

      if (episodeData.location_data) {
        try {
          dispatch({ type: 'SET_LOCATIONS', payload: JSON.parse(episodeData.location_data) });
        } catch (e) {
          console.warn('Failed to parse location_data, falling back to global locations:', e);
          if (globalLocs.length > 0) {
            dispatch({
              type: 'SET_LOCATIONS',
              payload: globalLocs.map((l: any) => ({
                id: l.id,
                name: l.name,
                visualDescription: l.visual_description || undefined,
              }))
            });
          }
        }
      } else if (globalLocs.length > 0) {
        dispatch({
          type: 'SET_LOCATIONS',
          payload: globalLocs.map((l: any) => ({
            id: l.id,
            name: l.name,
            visualDescription: l.visual_description || undefined,
          }))
        });
      }

      if (scenesData.length > 0) {
        const mappedScenes = scenesData.map((scene: any) => {
          const rawAnalysis =
            scene.analysis && typeof scene.analysis === 'object' && !Array.isArray(scene.analysis)
              ? scene.analysis
              : {};
          const { cameraAngleSlots, ...analysis } = rawAnalysis;

          return {
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
            analysis: Object.keys(analysis).length > 0 ? analysis : undefined,
            cameraAngleSlots: Array.isArray(cameraAngleSlots)
              ? cameraAngleSlots.map((slot: any) => ({ ...slot, isGenerating: false }))
              : [],
            optimizations: scene.optimizations || []
          };
        });

        dispatch({ type: 'SET_SCENES', payload: mappedScenes });

        const sceneIds = scenesData.map((s: any) => s.id);
        const promptsByScene = await fetchAllPromptsForScenes(sceneIds);
        const allMappedPrompts: Record<string, any[]> = Object.fromEntries(
          sceneIds.map((sceneId: string) => [sceneId, []])
        );
        
        promptsByScene.forEach((prompts, sceneId) => {
          if (prompts.length > 0) {
            allMappedPrompts[sceneId] = prompts.map((p: any) => ({
              id: p.id,
              type: p.type,
              label: p.label,
              shotType: p.shot_type,
              summary: p.summary,
              explanation: p.explanation,
              promptText: p.prompt_text,
              aspectRatio: p.aspect_ratio,
              generationType: p.generation_type,
              revisionPrompt: p.revision_prompt,
              versions: [p.prompt_text],
              isPinned: p.is_pinned ?? false,
              isPinnedByAI: false,
            }));
          }
        });

        dispatch({ type: 'SET_ALL_PROMPTS', payload: allMappedPrompts });
      }

      const storedTimeContexts = Array.isArray(episodeData.time_contexts) && episodeData.time_contexts.length > 0
        ? episodeData.time_contexts
        : null;
      if (storedTimeContexts) {
        dispatch({ type: 'SET_TIME_CONTEXTS', payload: storedTimeContexts });
      }
    } catch (error) {
      console.error('❌ Error loading episode data:', error);
      toast({
        title: "Error loading episode",
        description: error instanceof Error ? error.message : "Failed to load episode data",
        variant: "destructive"
      });
    } finally {
      setLoadingData(false);
    }
  }, [projectId, episodeId, dispatch, toast]);

  return {
    loadingData,
    project,
    episode,
    loadEpisodeData
  };
}

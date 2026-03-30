import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { LeftPanel } from '@/components/LeftPanel';
import { CenterPanel } from '@/components/CenterPanel';
import { RightPanel } from '@/components/RightPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { InfoModal } from '@/components/InfoModal';
import { ExportModal } from '@/components/ExportModal';
import { EntityCardPanel } from '@/components/EntityCardPanel';
import { EpisodeStylePanel } from '@/components/EpisodeStylePanel';
import { EpisodeStyleHistoryModal } from '@/components/EpisodeStyleHistoryModal';
import { ReferencePanel } from '@/components/ReferencePanel';
import { ScriptUploader } from '@/components/ScriptUploader';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAppState } from '@/hooks/useAppState';
import { parseDocument } from '@/lib/documentParser';
import { parseEpisodes } from '@/lib/contextDetection';
import { generatePrompts, loadSystemPrompt } from '@/lib/geminiApi';
import { analyzeTextIntoScenes, generateEpisodePrompt, generateEpisodePromptTurkishExplanation, reviseEpisodePrompt } from '@/lib/sceneAnalyzer';
import { analyzeReferenceImage } from '@/lib/referenceAnalyzer';
import { generatePromptsForScene, revisePrompt, autoSelectBestPrompt } from '@/lib/promptGenerator';
import { fetchProject, fetchEpisode, fetchScenes, saveScenes, fetchPrompts, fetchAllPromptsForScenes, savePrompts, updateEpisode, fetchGlobalCharacters, fetchGlobalLocations, upsertGlobalCharacter, upsertGlobalLocation, saveTimeContexts, setPinnedPrompt, fetchReferences, updateReferenceAssignments } from '@/lib/supabaseQueries';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { aiProvider } from '@/lib/aiProvider';
import type { TextSegment, Scene, SubScene, PromptVariant, ConsistencyGroup, PromptAnalysis, PromptCard, EpisodeStyleVersion } from '@/types';


const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const PROMPT_GENERATION_DELAY_MS = 2000;
const AUTO_SAVE_DEBOUNCE_MS = 2000;

const Index = () => {
  const { id: projectId, episodeId } = useParams<{ id: string; episodeId: string }>();
  const navigate = useNavigate();
  const { state, dispatch, undo, redo } = useAppState();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingData, setLoadingData] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [project, setProject] = useState<{ title: string; master_prompt?: string } | null>(null);
  const [episode, setEpisode] = useState<{ title: string; document_text?: string } | null>(null);
  const [noKeysWarning, setNoKeysWarning] = useState(false);
  useEffect(() => {
    if (user?.id) {
      aiProvider.initialize(user.id)
        .then(() => {
          // Sync model from settings
          aiProvider.setModel(state.settings.model);
          setNoKeysWarning(!aiProvider.hasKeys());
        })
        .catch(err => {
          console.error('Failed to initialize AI provider:', err);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sync model to aiProvider whenever settings change
  useEffect(() => {
    aiProvider.setModel(state.settings.model);
  }, [state.settings.model]);

  // Load episode data from Supabase
  useEffect(() => {
    if (projectId && episodeId) {
      loadEpisodeData();
    }
  }, [projectId, episodeId]);

  async function loadEpisodeData() {
    setLoadingData(true);
    try {
      console.log('📥 Loading episode data:', episodeId);

      const [projectData, episodeData, scenesData, globalChars, globalLocs, referencesData] = await Promise.all([
        fetchProject(projectId!),
        fetchEpisode(episodeId!),
        fetchScenes(episodeId!),
        fetchGlobalCharacters(projectId!),
        fetchGlobalLocations(projectId!),
        fetchReferences(episodeId!)
      ]);

      console.log('✅ Loaded:', {
        project: projectData.title,
        episode: episodeData.title,
        scenes: scenesData.length
      });

      setProject(projectData);
      setEpisode(episodeData);

      console.log('📎 References from DB:', referencesData?.length, referencesData);
      // Add references to state
      dispatch({ type: 'SET_REFERENCES', payload: referencesData || [] });
      console.log('📎 SET_REFERENCES dispatched');

      // Load master prompt from project
      if (projectData.master_prompt) {
        dispatch({ type: 'SET_MASTER_PROMPT', payload: projectData.master_prompt });
      }

      // Load document text — sync both mainText and documentText
      if (episodeData.document_text) {
        dispatch({ type: 'SET_DOCUMENT_TEXT', payload: episodeData.document_text });
        // Re-derive episodes from the stored HTML by stripping tags first,
        // so the navigator (LeftPanel) is populated correctly after a page refresh.
        const plainText = episodeData.document_text.replace(/<[^>]+>/g, '');
        const derivedEpisodes = parseEpisodes(plainText);
        dispatch({ type: 'SET_EPISODES', payload: derivedEpisodes });
      }

      // Load episode-level style prompt (overrides/extends master prompt for this episode)
      if (episodeData.episode_prompt) {
        dispatch({ type: 'SET_EPISODE_PROMPT', payload: episodeData.episode_prompt });
      } else {
        dispatch({ type: 'SET_EPISODE_PROMPT', payload: '' });
      }

      // Load Turkish translation of the episode prompt
      if (episodeData.episode_prompt_tr) {
        dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: episodeData.episode_prompt_tr });
      } else {
        dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: '' });
      }

      // Load episode style history
      if (Array.isArray(episodeData.episode_style_history) && episodeData.episode_style_history.length > 0) {
        dispatch({ type: 'SET_EPISODE_STYLE_HISTORY', payload: episodeData.episode_style_history as EpisodeStyleVersion[] });
      } else {
        dispatch({ type: 'SET_EPISODE_STYLE_HISTORY', payload: [] });
      }

      // Load characters: prefer episode-specific character_data (preserves exact IDs
      // used by scene cards) over global_characters table.
      if (episodeData.character_data) {
        try {
          dispatch({ type: 'SET_CHARACTERS', payload: JSON.parse(episodeData.character_data) });
        } catch (e) {
          console.warn('Failed to parse character_data, falling back to global characters:', e);
          if (globalChars.length > 0) {
            dispatch({
              type: 'SET_CHARACTERS',
              payload: globalChars.map((c: { id: string; name: string; role?: string | null; is_crowd?: boolean | null; visual_description?: string | null }) => ({
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
          payload: globalChars.map((c: { id: string; name: string; role?: string | null; is_crowd?: boolean | null; visual_description?: string | null }) => ({
            id: c.id,
            name: c.name,
            role: c.role || undefined,
            isCrowd: c.is_crowd ?? false,
            visualDescription: c.visual_description || undefined,
          }))
        });
      }

      // Load locations: prefer episode-specific location_data over global_locations table.
      if (episodeData.location_data) {
        try {
          dispatch({ type: 'SET_LOCATIONS', payload: JSON.parse(episodeData.location_data) });
        } catch (e) {
          console.warn('Failed to parse location_data, falling back to global locations:', e);
          if (globalLocs.length > 0) {
            dispatch({
              type: 'SET_LOCATIONS',
              payload: globalLocs.map((l: { id: string; name: string; visual_description?: string | null }) => ({
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
          payload: globalLocs.map((l: { id: string; name: string; visual_description?: string | null }) => ({
            id: l.id,
            name: l.name,
            visualDescription: l.visual_description || undefined,
          }))
        });
      }

      // Load scenes into state
      if (scenesData.length > 0) {
        const mappedScenes = scenesData.map((scene: any) => ({
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
          optimizations: scene.optimizations || []
        }));

        dispatch({ type: 'SET_SCENES', payload: mappedScenes });

        // Load ALL prompts in a SINGLE batch request
        const promptsByScene = await fetchAllPromptsForScenes(scenesData.map(s => s.id));
        const allMappedPrompts: Record<string, any[]> = {};
        
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

      // Load time contexts from Supabase (backward compatible: if column missing treat as [])
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
  }

  // Auto-save episode-level data (document text, characters, locations, time contexts) independently
  // of sceneCards so that time contexts added before analysis are never lost on refresh.
  useEffect(() => {
    if (!loadingData && episodeId && episode) {
      const saveEpisodeData = async () => {
        try {
        await updateEpisode(episodeId, {
            document_text: state.documentText || undefined,
            character_data: JSON.stringify(state.characters),
            location_data: JSON.stringify(state.locations),
            episode_prompt: state.episodePrompt || undefined,
            episode_prompt_tr: state.episodePromptTr || undefined,
            episode_style_history: state.episodeStyleHistory,
          });
          await saveTimeContexts(episodeId, state.timeContexts);
        } catch (err) {
          console.warn('Failed to save episode-level data:', err);
        }
      };
      const id = setTimeout(saveEpisodeData, AUTO_SAVE_DEBOUNCE_MS);
      return () => clearTimeout(id);
    }
  }, [state.documentText, state.characters, state.locations, state.episodePrompt, state.episodePromptTr, state.episodeStyleHistory, state.timeContexts, episodeId, loadingData, episode]);

  // Auto-save scenes to Supabase whenever sceneCards change
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const doSave = useCallback(async () => {
    if (!episodeId || state.sceneCards.length === 0) return;
    if (isSavingRef.current) {
      // Another save already running – mark as pending so it re-runs when done
      pendingSaveRef.current = true;
      console.log('⏳ Save already in progress, queuing…');
      return;
    }

    isSavingRef.current = true;
    pendingSaveRef.current = false;

    try {
      setSavingStatus('saving');
      console.log('💾 Auto-saving scenes...');

      // Save scenes - using native UUIDs from React state directly
      const savedScenes = await saveScenes(episodeId, state.sceneCards);

      // Save time contexts and episode prompts
      await updateEpisode(episodeId, {
        time_contexts: state.timeContexts,
        episode_prompt: state.episodePrompt,
        episode_prompt_tr: state.episodePromptTr
      });

      // Save prompts in parallel batches (5 at a time) with error isolation
      const PROMPT_BATCH = 5;
      const scenesWithPrompts = state.sceneCards.filter(scene => scene.prompts.length > 0);

      let failedCount = 0;
      for (let i = 0; i < scenesWithPrompts.length; i += PROMPT_BATCH) {
        const batch = scenesWithPrompts.slice(i, i + PROMPT_BATCH);
        const results = await Promise.allSettled(
          batch.map(scene => savePrompts(scene.id, scene.prompts))
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

      // Reset to idle after 2 seconds
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
      // If another save was requested while we were busy, run it now
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        doSave();
      }
    }
  }, [episodeId, state.sceneCards, state.timeContexts, state.episodePrompt, state.episodePromptTr, toast]);

  useEffect(() => {
    if (!loadingData && state.sceneCards.length > 0 && episodeId) {
      const timeoutId = setTimeout(doSave, AUTO_SAVE_DEBOUNCE_MS);
      return () => clearTimeout(timeoutId);
    }
  }, [state.sceneCards, state.timeContexts, state.episodePrompt, state.episodePromptTr, episodeId, loadingData, doSave]);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [showEntityPanel, setShowEntityPanel] = useState(false);
  const [showEpisodeStylePanel, setShowEpisodeStylePanel] = useState(false);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [showScriptUploader, setShowScriptUploader] = useState(false);
  const [isRevisingEpisodeStyle, setIsRevisingEpisodeStyle] = useState(false);
  const [showStyleHistory, setShowStyleHistory] = useState(false);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);

  const handleScriptComplete = useCallback((result: {
    sceneCards: import('@/types').SceneCard[];
    characters: import('@/types').Character[];
    locations: import('@/types').Location[];
    suggestedTimeContexts?: import('@/types').TimeContext[];
    episodePrompt?: string;
    episodePromptTr?: string;
  }) => {
    dispatch({ type: 'FINISH_ANALYSIS', payload: result });
    if (result.episodePrompt) {
      dispatch({ type: 'SET_EPISODE_PROMPT', payload: result.episodePrompt });
    }
    if (result.episodePromptTr) {
      dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: result.episodePromptTr });
    }
    setShowScriptUploader(false);
  }, [dispatch]);

  const handleReviseEpisodeStyle = useCallback(async (instruction: string) => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }
    // Mevcut stili geçmişe ekle (yeni sürüm üretilmeden önce)
    if (state.episodePrompt) {
      const snapshot: EpisodeStyleVersion = {
        id: crypto.randomUUID(),
        prompt: state.episodePrompt,
        promptTr: state.episodePromptTr,
        instruction,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_EPISODE_STYLE_VERSION', payload: snapshot });
    }
    setIsRevisingEpisodeStyle(true);
    try {
      const revised = await reviseEpisodePrompt(state.episodePrompt, instruction);
      dispatch({ type: 'SET_EPISODE_PROMPT', payload: revised });
      const tr = await generateEpisodePromptTurkishExplanation(revised);
      dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: tr });
      toast({ title: '✨ Bölüm stili oluşturuldu', description: 'Türkçe özet de yenilendi.' });
    } catch (err) {
      console.error('Episode style revision failed:', err);
      toast({ title: 'Oluşturma başarısız', description: err instanceof Error ? err.message : 'Bilinmeyen hata', variant: 'destructive' });
    } finally {
      setIsRevisingEpisodeStyle(false);
    }
  }, [state.episodePrompt, state.episodePromptTr, dispatch, toast]);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const bulkAbortRef = useRef<AbortController | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBulkGeneratingPrompts, setIsBulkGeneratingPrompts] = useState(false);
  const [bulkPromptsProgress, setBulkPromptsProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const bulkPromptsAbortRef = useRef<AbortController | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16'>('16:9');
  // Use a ref to access current scenes without adding them as a callback dependency
  const scenesRef = useRef(state.scenes);
  scenesRef.current = state.scenes;

  // Ctrl+Z / Ctrl+Y global keyboard shortcuts
  useEffect(() => {
    const savedAspectRatio = localStorage.getItem('aspectRatio');
    if (savedAspectRatio) {
      setAspectRatio(savedAspectRatio as '16:9' | '4:3' | '1:1' | '9:16');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aspectRatio', aspectRatio);
  }, [aspectRatio]);

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

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const text = await parseDocument(file);
      dispatch({ type: 'SET_MAIN_TEXT', payload: { text, fileName: file.name } });
      const episodes = parseEpisodes(text);
      dispatch({ type: 'SET_EPISODES', payload: episodes });

      // Immediately persist the document text to Supabase so it survives page refresh
      if (episodeId) {
        try {
          await updateEpisode(episodeId, { document_text: text });
        } catch (saveErr) {
          console.error('Failed to save document text:', saveErr);
        }
      }
    } catch (e) {
      console.error('Dosya okunamadı', e);
    }
  }, [dispatch, episodeId]);

  const handleAddScene = useCallback((segment: TextSegment, episodeTitle: string) => {
    const scene: Scene = {
      id: crypto.randomUUID(),
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
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }
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
        apiKey: '',
        model: state.settings.model,
        variantCount: state.settings.variantCount,
        temperature: state.settings.temperature,
        consistencyGroups: subGroups.length > 0 ? subGroups : undefined,
        allScenes: state.scenes,
        systemPrompt: loadSystemPrompt(),
        subScene,
        parentScene: scene,
        parentConsistencyGroups: parentGroups.length > 0 ? parentGroups : undefined,
        generateFn: aiProvider.generateContent.bind(aiProvider),
      });

      const prompts: PromptVariant[] = results.map((r, i) => ({
        id: crypto.randomUUID(),
        shotType: r.shotType,
        text: r.text,
        summary: r.summary,
        attachedEntityIds: [],
        versions: [r.text],
        isRevising: false,
      }));
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, prompts, status: 'done' } } });
    } catch (e: any) {
      console.error('Sub-scene generation failed:', e);
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, status: 'error' } } });
    }
  }, [state, dispatch]);

  const handleReviseSubScene = useCallback(async (sceneId: string, subSceneId: string, promptId: string, instruction: string) => {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const subScene = (scene.subScenes || []).find(ss => ss.id === subSceneId);
    if (!subScene) return;
    const prompt = subScene.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    // Version restore — no API call needed
    if (instruction.startsWith('__RESTORE__::')) {
      const restored = instruction.slice('__RESTORE__::'.length);
      const updatedPrompts = subScene.prompts.map(p =>
        p.id === promptId ? { ...p, text: restored, versions: [...p.versions, restored] } : p
      );
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, prompts: updatedPrompts } } });
      return;
    }

    try {
      const revised = await revisePrompt(prompt.text, instruction, '', state.settings.model, state.settings.temperature);
      const updatedPrompts = subScene.prompts.map(p =>
        p.id === promptId ? { ...p, text: revised, versions: [...p.versions, revised] } : p
      );
      dispatch({ type: 'UPDATE_SUB_SCENE', payload: { sceneId, subScene: { ...subScene, prompts: updatedPrompts } } });
    } catch (e: any) {
      console.error('Sub-scene revizyon başarısız', e);
    }
  }, [state, dispatch]);


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
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      setSettingsOpen(false);
      return;
    }
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Create AbortController for this scene
    const controller = new AbortController();
    abortControllersRef.current.set(sceneId, controller);

    dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, status: 'generating' } });

    const groups = state.consistencyGroups.filter(g => scene.consistencyGroupIds?.includes(g.id));

    // Determine effective variant count based on scene analysis
    const sceneAnalysis = state.sceneAnalyses[sceneId];
    let effectiveVariantCount: number = state.settings.variantCount;
    if (sceneAnalysis) {
      if (sceneAnalysis.narrativeType === 'timelapse') {
        effectiveVariantCount = Math.min(Math.max(sceneAnalysis.suggestedPromptCount, state.settings.variantCount), 5);
      } else if (sceneAnalysis.narrativeType === 'sequence') {
        effectiveVariantCount = Math.min(Math.max(sceneAnalysis.suggestedPromptCount, state.settings.variantCount), 4);
      }
    }

    try {
      if (controller.signal.aborted) {
        abortControllersRef.current.delete(sceneId);
        return;
      }
      const sceneEntities = {
        characters: state.extractedEntities.filter(e => e.type === 'character' && e.sceneIds.includes(sceneId)),
        locations: state.extractedEntities.filter(e => e.type === 'location' && e.sceneIds.includes(sceneId)),
      };
      const results = await generatePrompts({
        scene,
        apiKey: '',
        model: state.settings.model,
        variantCount: effectiveVariantCount,
        temperature: state.settings.temperature,
        consistencyGroups: groups.length > 0 ? groups : undefined,
        allScenes: state.scenes,
        systemPrompt: loadSystemPrompt(),
        sceneEntities: (sceneEntities.characters.length > 0 || sceneEntities.locations.length > 0) ? sceneEntities : undefined,
        sceneAnalysis: sceneAnalysis,
        signal: controller.signal,
        generateFn: aiProvider.generateContent.bind(aiProvider),
      });

      const prompts: PromptVariant[] = results.map((r) => ({
        id: crypto.randomUUID(),
        shotType: r.shotType,
        text: r.text,
        summary: r.summary,
        attachedEntityIds: [],
        versions: [r.text],
        isRevising: false,
      }));
      dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, prompts, status: 'done' } });
      abortControllersRef.current.delete(sceneId);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        abortControllersRef.current.delete(sceneId);
        return;
      }
      console.error('Generation failed:', e);
      dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, status: 'error' } });
      abortControllersRef.current.delete(sceneId);
    }
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

      // Determine effective variant count based on scene analysis
      const sceneAnalysis = state.sceneAnalyses[sceneRef.id];
      let effectiveVariantCount: number = state.settings.variantCount;
      if (sceneAnalysis) {
        if (sceneAnalysis.narrativeType === 'timelapse') {
          effectiveVariantCount = Math.min(Math.max(sceneAnalysis.suggestedPromptCount, state.settings.variantCount), 5);
        } else if (sceneAnalysis.narrativeType === 'sequence') {
          effectiveVariantCount = Math.min(Math.max(sceneAnalysis.suggestedPromptCount, state.settings.variantCount), 4);
        }
      }

      if (bulkController.signal.aborted) {
        dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'pending' } });
        break;
      }

      try {
        const sceneEntitiesAll = {
          characters: state.extractedEntities.filter(e => e.type === 'character' && e.sceneIds.includes(sceneRef.id)),
          locations: state.extractedEntities.filter(e => e.type === 'location' && e.sceneIds.includes(sceneRef.id)),
        };
        const results = await generatePrompts({
          scene: sceneRef,
          apiKey: '',
          model: state.settings.model,
          variantCount: effectiveVariantCount,
          temperature: state.settings.temperature,
          consistencyGroups: groups.length > 0 ? groups : undefined,
          allScenes: state.scenes,
          systemPrompt: loadSystemPrompt(),
          sceneEntities: (sceneEntitiesAll.characters.length > 0 || sceneEntitiesAll.locations.length > 0) ? sceneEntitiesAll : undefined,
          sceneAnalysis: sceneAnalysis,
          signal: bulkController.signal,
          generateFn: aiProvider.generateContent.bind(aiProvider),
        });

        const prompts: PromptVariant[] = results.map((r) => ({
          id: crypto.randomUUID(),
          shotType: r.shotType,
          text: r.text,
          summary: r.summary,
          attachedEntityIds: [],
          versions: [r.text],
          isRevising: false,
        }));
        dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, prompts, status: 'done' } });
      } catch (e: any) {
        if (e.name === 'AbortError') {
          dispatch({ type: 'UPDATE_SCENE', payload: { ...sceneRef, status: 'pending' } });
          break;
        }
        console.error('Bulk generation error:', e);
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
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const prompt = scene.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    // Version restore — no API call needed
    if (instruction.startsWith('__RESTORE__::')) {
      const restored = instruction.slice('__RESTORE__::'.length);
      const updatedPrompts = scene.prompts.map(p =>
        p.id === promptId ? { ...p, text: restored, versions: [...p.versions, restored] } : p
      );
      dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, prompts: updatedPrompts } });
      return;
    }

    try {
      const revised = await revisePrompt(prompt.text, instruction, '', state.settings.model, state.settings.temperature);
      const updatedPrompts = scene.prompts.map(p =>
        p.id === promptId
          ? { ...p, text: revised, versions: [...p.versions, revised] }
          : p
      );
      dispatch({ type: 'UPDATE_SCENE', payload: { ...scene, prompts: updatedPrompts } });
    } catch (e: any) {
      console.error('Revizyon başarısız', e);
    }
  }, [state, dispatch]);

  const handleRefreshAll = useCallback(async (sceneId: string) => {
    await handleGenerate(sceneId);
  }, [handleGenerate]);

  // ─── Two-stage AI workflow handlers ─────────────────────────────
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
        targetSceneCount
      );
      dispatch({ type: 'FINISH_ANALYSIS', payload: result });

      // Mevcut referansları yeni sahnelere ata
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
              result.sceneCards
            );
            
            dispatch({ type: 'UPDATE_REFERENCE', payload: { ...ref, assignedSceneIds, aiAnalysis }});
            await updateReferenceAssignments(ref.id, assignedSceneIds);
          }
          setAnalysisLog(prev => [...prev, `✅ ${state.references.length} referans sahnelere atandı`]);
        } catch (refErr) {
          console.warn('Referans atama hatası:', refErr);
        }
      }

      setTimeout(() => setAnalysisLog([]), 3000);

      try {
        setAnalysisLog(prev => [...prev, '🎨 Bölüm stili (episode prompt) üretiliyor...']);
        // Episode prompt'u otomatik oluştur
        const episodePrompt = await generateEpisodePrompt(
          selectedText,
          result.characters,
          result.locations
        );
        if (episodePrompt) {
          dispatch({ type: 'SET_EPISODE_PROMPT', payload: episodePrompt });
          
          setAnalysisLog(prev => [...prev, '🇹🇷 Bölüm stili Türkçe özeti yazılıyor...']);
          const turkishExplanation = await generateEpisodePromptTurkishExplanation(episodePrompt);
          if (turkishExplanation) {
            dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: turkishExplanation });
          }
        }
      } catch (promptErr) {
        console.error('Episode prompt generation error:', promptErr);
        toast({
          title: 'Stil Rehberi Hatası',
          description: 'Görsel stil rehberi üretilemedi ama analiz tamamlandı.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Scene analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze text',
        variant: 'destructive'
      });
      dispatch({ type: 'FINISH_ANALYSIS', payload: { sceneCards: [], characters: [], locations: [] } });
    }
  }, [dispatch, toast, state.references]);

  const handleGeneratePromptsForScene = useCallback(async (sceneId: string, isRegeneration: boolean = false): Promise<boolean> => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return false;

    const sceneCharacters = state.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = state.locations.filter(l => scene.locationIds.includes(l.id));
    // Use only the scene's own time contexts (no fallback to all)
    const sceneTimeContexts = state.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));

    dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

    try {
      const result = await generatePromptsForScene(
        scene,
        sceneCharacters,
        sceneLocations,
        state.masterPrompt,
        undefined,
        undefined,
        aspectRatio,
        state.sceneAnalyses[sceneId],
        sceneTimeContexts,
        state.episodePrompt || undefined,
        state.references,
        isRegeneration ? 'regenerate' : 'initial',
        () => {
          toast({
            title: '⚠️ Yapay Zeka Yanıtı Onarılıyor',
            description: 'Yapay zeka yanıtı bozuk geldi, otomatik onarım deneniyor...',
          });
        }
      );
      // Final dispatch with complete result
      dispatch({ 
        type: 'FINISH_PROMPT_GENERATION', 
        payload: { 
          sceneId, 
          prompts: result.prompts,
          analysis: result.analysis,
          optimizations: result.optimizations,
        } 
      });

      // ── Auto-pin: AI selects the best prompt ──
      if (result.prompts.length > 1) {
        try {
          const sceneForPin = state.sceneCards.find(s => s.id === sceneId);
          const { selectedIndex, reason } = await autoSelectBestPrompt(
            result.prompts,
            sceneForPin?.text || '',
            sceneForPin?.visualNote || ''
          );
          const bestPrompt = result.prompts[selectedIndex];
          if (bestPrompt) {
            console.log(`[autoPin] Scene ${sceneId}: selected prompt ${selectedIndex} — ${reason}`);
            dispatch({ type: 'SET_PINNED_PROMPT', payload: { sceneId, promptId: bestPrompt.id, byAI: true } });
            // Persist to DB (fire-and-forget)
            setPinnedPrompt(sceneId, bestPrompt.id).catch(err =>
              console.warn('[autoPin] DB save failed:', err)
            );
          }
        } catch (pinErr) {
          console.warn('[autoPin] Auto-selection failed, skipping:', pinErr);
        }
      }

      return true;
    } catch (error) {
      console.error('Prompt generation error:', error);
      // Revert status to analyzed on error
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [] },
      });
      return false;
    }
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.sceneAnalyses, state.timeContexts, dispatch, aspectRatio]);

  const WORKER_COUNT = 3;

  const handleGenerateAllPrompts = useCallback(async () => {
    if (isBulkGeneratingPrompts) return;

    const scenesWithoutPrompts = state.sceneCards.filter(
      s => s.prompts.length === 0 && s.status !== 'generating'
    );
    if (scenesWithoutPrompts.length === 0) return;

    const controller = new AbortController();
    bulkPromptsAbortRef.current = controller;
    setIsBulkGeneratingPrompts(true);
    setBulkPromptsProgress({ done: 0, total: scenesWithoutPrompts.length });

    // Paylaşılan kuyruk
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
        
        // Ardışık 5 hata = tüm keyler rate limit yedi, 10sn bekle
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

    // Worker fonksiyonu — kuyruktan sahne çeker
    const worker = async (): Promise<void> => {
      while (queue.length > 0 && !controller.signal.aborted) {
        const scene = queue.shift();
        if (!scene) break;
        await processScene(scene);
        // Worker'lar arası küçük offset (rate limit dağıtımı)
        await new Promise(r => setTimeout(r, 200));
      }
    };

    try {
      // 3 worker paralel çalışır
      await Promise.all(
        Array.from({ length: WORKER_COUNT }, () => worker())
      );

      // Hata worker: başarısız sahneleri tekrar dene
      if (failedScenes.length > 0 && !controller.signal.aborted) {
        toast({
          title: `🔄 ${failedScenes.length} sahne yeniden deneniyor...`,
        });
        // 5sn bekle, sonra tek tek dene
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
      
      const stillFailed = failedScenes.filter(
        s => state.sceneCards.find(sc => sc.id === s.id)?.prompts.length === 0
      );
      if (stillFailed.length > 0) {
        toast({
          title: `❌ ${stillFailed.length} sahne üretilemedi`,
          description: 'Manuel olarak tekrar deneyebilirsiniz.',
          variant: 'destructive'
        });
      }
    }
  }, [isBulkGeneratingPrompts, state.sceneCards, handleGeneratePromptsForScene, toast]);

  const handleCancelBulkPrompts = useCallback(() => {
    bulkPromptsAbortRef.current?.abort();
  }, []);

  const handleRegenerateAllScenes = useCallback(async () => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }
    if (state.sceneCards.length === 0) {
      toast({ title: 'Sahne yok', description: 'Önce sahneleri analiz edin.' });
      return;
    }
    // Tüm sahne kartlarının promptlarını temizle, status'u sıfırla
    state.sceneCards.forEach(sc => {
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId: sc.id, prompts: [] },
      });
    });
    // Kısa gecikme sonra normal bulk pipeline'ı başlat
    await new Promise(r => setTimeout(r, 150));
    await handleGenerateAllPrompts();
  }, [state.sceneCards, dispatch, handleGenerateAllPrompts, toast]);


  const handleRegenerateAllPrompts = useCallback(async (sceneId: string) => {
    await handleGeneratePromptsForScene(sceneId, true);
  }, [handleGeneratePromptsForScene]);

  const handleAddVariation = useCallback(async (sceneId: string) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const sceneCharacters = state.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = state.locations.filter(l => scene.locationIds.includes(l.id));
    const sceneTimeContexts = state.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));
    const existingPrompts = scene.prompts;

    dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

    try {
      const result = await generatePromptsForScene(
        scene,
        sceneCharacters,
        sceneLocations,
        state.masterPrompt,
        undefined,
        undefined,
        aspectRatio,
        state.sceneAnalyses[sceneId],
        sceneTimeContexts,
        state.episodePrompt || undefined,
        state.references,
        'regenerate',
        () => {
          toast({
            title: '⚠️ Yapay Zeka Yanıtı Onarılıyor',
            description: 'Yapay zeka yanıtı bozuk geldi, otomatik onarım deneniyor...',
          });
        }
      );
      
      // Final complete update
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: { sceneId, prompts: [...existingPrompts, ...result.prompts] },
      });
    } catch (error) {
      console.error('Variation generation error:', error);
      dispatch({ type: 'FINISH_PROMPT_GENERATION', payload: { sceneId, prompts: existingPrompts } });
    }
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.sceneAnalyses, state.timeContexts, dispatch, aspectRatio]);

  const handleRestoreSceneCardPrompt = useCallback((sceneId: string, entry: any) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const restoredPrompt: PromptCard = {
      id: entry.id || crypto.randomUUID(),
      shotType: entry.shot_type || 'establishing',
      promptText: entry.prompt_text || '',
      summary: entry.summary || 'Önceki versiyondan geri yüklendi',
      explanation: entry.explanation || '',
      aspectRatio: entry.aspect_ratio || '16:9',
      label: entry.label || undefined,
      versions: []
    };

    dispatch({
      type: 'FINISH_PROMPT_GENERATION',
      payload: { sceneId, prompts: [...scene.prompts, restoredPrompt] },
    });
    toast({ title: 'Başarılı', description: 'Önceki prompt versiyonu sahneye eklendi.' });
  }, [state.sceneCards, dispatch, toast]);

  const handleDeletePrompt_ = useCallback((sceneId: string, promptId: string) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;
    dispatch({
      type: 'FINISH_PROMPT_GENERATION',
      payload: { sceneId, prompts: scene.prompts.filter(p => p.id !== promptId) }
    });
  }, [state.sceneCards, dispatch]);

  const handleRevisePrompt_ = useCallback(async (sceneId: string, promptId: string, instruction: string) => {
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;
    
    const promptToRevise = scene.prompts.find(p => p.id === promptId);
    if (!promptToRevise) return;

    try {
      // Optik feedback için UI'ı güncelliyoruz diye bir şey yapabiliriz ama
      // şimdilik toast ile bilgi verelim. (SceneCard içinde loading idare edilebilir)
      const revisedText = await revisePrompt(
        promptToRevise.promptText,
        instruction,
        '', // apiKey (aiProvider uses its internal key array)
        state.settings.model,
        state.settings.temperature
      );

      const updatedPrompt: PromptCard = {
        ...promptToRevise,
        id: crypto.randomUUID(), // New UUID so upsert doesn't overwrite the original in DB
        promptText: revisedText,
        versions: [...promptToRevise.versions, revisedText],
        generationType: 'revision',
        revisionPrompt: instruction,
      };

      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: {
          sceneId,
          prompts: scene.prompts.map(p => p.id === promptId ? updatedPrompt : p)
        }
      });
      toast({ title: 'Başarılı', description: 'Prompt başarıyla revize edildi.' });
    } catch (e: any) {
      console.error('Revizyon başarısız:', e);
      toast({ title: 'Hata', description: 'Prompt revize edilemedi.', variant: 'destructive' });
    }
  }, [state, dispatch, toast]);

  const handleSetPinnedPrompt = useCallback(async (sceneId: string, promptId: string) => {
    // Update state immediately (optimistic)
    dispatch({ type: 'SET_PINNED_PROMPT', payload: { sceneId, promptId, byAI: false } });
    // Persist to DB
    try {
      await setPinnedPrompt(sceneId, promptId);
    } catch (err) {
      console.error('[handleSetPinnedPrompt] DB error:', err);
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

    // Persist to Supabase so the character survives page refresh
    if (projectId) {
      upsertGlobalCharacter(projectId, { name, description: '' }).catch(err => {
        console.error('Failed to save character to Supabase:', err);
      });
    }
  }, [dispatch, projectId]);

  const handleAddNewLocationToSceneCard = useCallback((sceneId: string, name: string) => {
    const location = {
      id: `loc-${crypto.randomUUID()}`,
      name,
      description: '',
    };
    dispatch({ type: 'ADD_NEW_LOCATION_TO_SCENE_CARD', payload: { sceneId, location } });

    // Persist to Supabase so the location survives page refresh
    if (projectId) {
      upsertGlobalLocation(projectId, { name, description: '' }).catch(err => {
        console.error('Failed to save location to Supabase:', err);
      });
    }
  }, [dispatch, projectId]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {projectId && episodeId && (
        <div className="flex items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/project/${projectId}`)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Project
            </Button>
            {episode && (
              <div>
                <span className="text-sm font-medium">{episode.title}</span>
                {project && (
                  <span className="text-xs text-muted-foreground ml-2">{project.title}</span>
                )}
              </div>
            )}
          </div>

          {/* Save Status Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {savingStatus === 'saving' && (
              <span className="text-yellow-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                Saving...
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="text-green-600 flex items-center gap-2">
                ✓ Saved
                {lastSavedAt && (
                  <span className="text-xs text-muted-foreground">
                    {lastSavedAt.toLocaleTimeString()}
                  </span>
                )}
              </span>
            )}
            {savingStatus === 'error' && (
              <span className="flex items-center gap-2 text-red-600">
                <span>✗ Kaydetme başarısız</span>
                <button
                  onClick={() => doSave()}
                  className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700 transition-colors"
                  title="Tekrar dene"
                  aria-label="Kaydetme işlemini tekrar dene"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                  Tekrar Dene
                </button>
              </span>
            )}
          </div>
        </div>
      )}
      <Header
        onUploadMain={() => mainFileRef.current?.click()}
        onUploadScript={() => setShowScriptUploader(true)}
        onExport={() => setExportOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onInfo={() => setInfoOpen(true)}
        mainFileName={state.mainFileName}
      />
      <div className="flex items-center gap-2 px-4 py-1 border-b border-border bg-card/50">
        <Button
          size="sm"
          variant={showEntityPanel ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => setShowEntityPanel(v => !v)}
        >
          🎭 Varlıklar
        </Button>
        <Button
          size="sm"
          variant={showEpisodeStylePanel ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => setShowEpisodeStylePanel(v => !v)}
        >
          🎨 Bölüm Stili
        </Button>
        <Button
          size="sm"
          variant={showReferencePanel ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => setShowReferencePanel(v => !v)}
        >
          🖼️ Referanslar
        </Button>
      </div>

      {/* No API keys banner */}
      {noKeysWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-yellow-800">
            ⚠️ API anahtarı bulunamadı. Gemini API anahtarlarınızı ekleyin.
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              onClick={() => navigate('/settings')}
            >
              Ayarlar Sayfasına Git
            </Button>
            <button
              className="text-yellow-600 hover:text-yellow-800 text-xs"
              onClick={() => setNoKeysWarning(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <input ref={mainFileRef} type="file" accept=".docx,.txt" className="hidden"
        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />

      {showScriptUploader && (
        <ScriptUploader
          onComplete={handleScriptComplete}
          onProgress={(msg) => setAnalysisLog(prev => [...prev, msg])}
          onClose={() => setShowScriptUploader(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="story-shot-layout">
          <Panel defaultSize={20} minSize={15}>
            <LeftPanel
              episodes={state.episodes}
              scenes={state.scenes}
              consistencyGroups={state.consistencyGroups}
              activeSceneId={state.activeSceneId}
              mainFileName={state.mainFileName}
              isAnalyzing={state.isAnalyzing}
              isLoading={loadingData}
              onEpisodeClick={(ep) => setScrollToIndex(ep.startIndex)}
              onSceneClick={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
              onMoveEpisode={(episodeId, newParentId) => dispatch({ type: 'MOVE_EPISODE', payload: { episodeId, newParentId } })}
              onReorderEpisodes={(eps) => dispatch({ type: 'REORDER_EPISODES', payload: eps })}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />

          <Panel defaultSize={40} minSize={20}>
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
              isLoading={loadingData}
              analysisLog={analysisLog}
            />
          </Panel>

          {showEpisodeStylePanel && (
            <>
              <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />
              <Panel defaultSize={15} minSize={10}>
                <EpisodeStylePanel
                  episodePrompt={state.episodePrompt}
                  episodePromptTr={state.episodePromptTr}
                  onSetEpisodePrompt={(prompt) => dispatch({ type: 'SET_EPISODE_PROMPT', payload: prompt })}
                  onSetEpisodePromptTr={(prompt) => dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: prompt })}
                  onReviseEpisodePrompt={handleReviseEpisodeStyle}
                  isRevising={isRevisingEpisodeStyle}
                  onShowHistory={() => setShowStyleHistory(true)}
                  historyCount={state.episodeStyleHistory.length}
                  onRegenerateAll={handleRegenerateAllScenes}
                  isGeneratingAll={isGeneratingAll}
                  sceneCount={state.scenes.length}
                  onClose={() => setShowEpisodeStylePanel(false)}
                />
              </Panel>
            </>
          )}

          {showEntityPanel && (
            <>
              <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />
              <Panel defaultSize={20} minSize={15}>
                <div className="flex h-full flex-col border-l border-border bg-card">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-sm font-medium">🎭 Varlıklar</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowEntityPanel(false)}>✕</Button>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <EntityCardPanel
                      characters={state.characters}
                      locations={state.locations}
                      timeContexts={state.timeContexts}
                      onUpsertCharacter={(c) => dispatch({ type: 'UPSERT_CHARACTER', payload: c })}
                      onDeleteCharacter={(id) => dispatch({ type: 'DELETE_CHARACTER', payload: id })}
                      onUpsertLocation={(l) => dispatch({ type: 'UPSERT_LOCATION', payload: l })}
                      onDeleteLocation={(id) => dispatch({ type: 'DELETE_LOCATION', payload: id })}
                      onAddTimeContext={(t) => dispatch({ type: 'ADD_TIME_CONTEXT', payload: t })}
                      onUpdateTimeContext={(t) => dispatch({ type: 'UPDATE_TIME_CONTEXT', payload: t })}
                      onDeleteTimeContext={(id) => dispatch({ type: 'DELETE_TIME_CONTEXT', payload: id })}
                    />
                  </div>
                </div>
              </Panel>
            </>
          )}

          {showReferencePanel && (
            <>
              <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />
              <Panel defaultSize={20} minSize={15}>
                <div className="flex h-full flex-col border-l border-border bg-card">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-sm font-medium">🖼️ Referanslar</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowReferencePanel(false)}>✕</Button>
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0">
                    <ReferencePanel
                      episodeId={episodeId ?? null}
                      references={state.references}
                      dispatch={dispatch}
                    />
                  </div>
                </div>
              </Panel>
            </>
          )}

          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />

          <Panel defaultSize={25} minSize={15}>
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
              onGenerateAllPrompts={handleGenerateAllPrompts}
              isBulkGeneratingPrompts={isBulkGeneratingPrompts}
              bulkPromptsProgress={bulkPromptsProgress}
              onCancelBulkPrompts={handleCancelBulkPrompts}
              sceneCards={state.sceneCards}
              characters={state.characters}
              locations={state.locations}
              timeContexts={state.timeContexts}
              onGeneratePrompts={handleGeneratePromptsForScene}
              onUpdateSceneCardNote={handleSetSceneNote}
              onAddVariation={handleAddVariation}
              onRegenerateAllPrompts_={handleRegenerateAllPrompts}
              onRevisePrompt={handleRevisePrompt_}
              onDeletePrompt={handleDeletePrompt_}
              onRestorePreviousPrompt_={handleRestoreSceneCardPrompt}
              onSetPinnedPrompt={handleSetPinnedPrompt}
              onAddCharacterToSceneCard={handleAddNewCharacterToSceneCard}
              onAddLocationToSceneCard={handleAddNewLocationToSceneCard}
              onDeleteSceneCard={id => dispatch({ type: 'REMOVE_SCENE', payload: id })}
              onRevise={handleRevise}
              onRefreshAll={handleRefreshAll}
              isLoading={loadingData}
              onSetActiveScene={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
              onRemoveScene={id => dispatch({ type: 'REMOVE_SCENE', payload: id })}
              onAddSceneToGroup={handleAddSceneToGroup}
              onRemoveSceneFromGroup={handleRemoveSceneFromGroup}
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
              onReorderSceneCards={(reordered) => dispatch({ type: 'REORDER_SCENE_CARDS', payload: reordered })}
            />
          </Panel>
        </PanelGroup>
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
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        sceneCards={state.sceneCards}
        characters={state.characters}
        locations={state.locations}
        timeContexts={state.timeContexts}
        episodeTitle={episode?.title || 'episode'}
        episodeId={episodeId || ''}
        episodePrompt={state.episodePrompt}
        episodePromptTr={state.episodePromptTr}
      />

      <InfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      {showStyleHistory && (
        <EpisodeStyleHistoryModal
          history={state.episodeStyleHistory}
          currentPrompt={state.episodePrompt}
          onRestore={(version) => {
            dispatch({ type: 'SET_EPISODE_PROMPT', payload: version.prompt });
            dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: version.promptTr });
            toast({ title: '⏪ Stil geri yüklendi', description: 'Seçilen sürüm aktif hale getirildi.' });
          }}
          onClose={() => setShowStyleHistory(false)}
        />
      )}
    </div>
  );
};

export default Index;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame } from 'lucide-react';
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
import { AgentDrawer } from '@/components/agent/AgentDrawer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAppState } from '@/hooks/useAppState';
import { useAgentSession } from '@/hooks/useAgentSession';
import { useEpisodeWorkspace } from '@/hooks/useEpisodeWorkspace';
import { useAutosave } from '@/hooks/useAutosave';
import { useAgentActions } from '@/hooks/useAgentActions';

import { parseDocument } from '@/lib/documentParser';
import { parseEpisodes } from '@/lib/episodeParser';
import { buildAgentContext, buildAgentUserPrompt } from '@/lib/agentContext';
import { applyAgentOperations } from '@/lib/agentOperations';
import { parseAgentOperationSet, stripAgentResultBlock } from '@/lib/agentParser';
import { AGENT_SYSTEM_PROMPT } from '@/lib/agentPrompts';
import { analyzeTextIntoScenes, generateEpisodePrompt, generateEpisodePromptExplanation, reviseEpisodePrompt } from '@/lib/sceneAnalyzer';
import { analyzeReferenceImage } from '@/lib/referenceAnalyzer';
import { generatePromptsForScene, revisePrompt, generatePromptForSlot } from '@/lib/promptGenerator';
import { updateEpisode, setPinnedPrompt, updateReferenceAssignments, fetchUserModel, saveUserModel } from '@/lib/supabaseQueries';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { aiProvider } from '@/lib/aiProvider';
import type {
  CameraAngleSlot,
  Character,
  Location,
  SceneCard,
  PromptCard,
  EpisodeStyleVersion,
  TimeContext,
} from '@/types';


const PROMPT_GENERATION_DELAY_MS = 2000;
const AUTO_SAVE_DEBOUNCE_MS = 2000;

type ImportResult = {
  episodePrompt?: string;
  episodePromptTr?: string;
  characters?: Character[];
  locations?: Location[];
  timeContexts?: TimeContext[];
  sceneCards?: SceneCard[];
  importedSceneCount: number;
  importedPromptCount: number;
  importedEntityCount: number;
};

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeVisualStyle(value: unknown): SceneCard['visualStyle'] {
  if (value === 'realistic' || value == null || value === '') return 'cinematic';
  if (value === 'cinematic' || value === 'symbolic' || value === 'scientific' || value === 'abstract') {
    return value;
  }
  return 'cinematic';
}

function findByName<T extends { id: string; name?: string; label?: string }>(items: T[], imported: any): T | undefined {
  const importedName = typeof imported?.name === 'string' ? imported.name : imported?.label;
  if (!importedName) return undefined;
  return items.find((item) => (item.name || item.label || '').toLowerCase() === importedName.toLowerCase());
}

function normalizeCharacter(raw: any, existing: Character[]): Character {
  const matched = raw?.id ? existing.find((item) => item.id === raw.id) : findByName(existing, raw);
  return {
    id: raw?.id || matched?.id || crypto.randomUUID(),
    name: raw?.name || matched?.name || 'Imported Character',
    role: raw?.role || matched?.role || '',
    visualDescription: raw?.visualDescription || matched?.visualDescription || raw?.description || '',
    isCrowd: raw?.isCrowd || matched?.isCrowd,
    age: raw?.age || matched?.age,
    ethnicity: raw?.ethnicity || matched?.ethnicity,
    clothing: raw?.clothing || matched?.clothing,
    physicalFeatures: raw?.physicalFeatures || matched?.physicalFeatures,
    hair: raw?.hair || matched?.hair,
    beard: raw?.beard || matched?.beard,
  };
}

function normalizeLocation(raw: any, existing: Location[]): Location {
  const matched = raw?.id ? existing.find((item) => item.id === raw.id) : findByName(existing, raw);
  return {
    id: raw?.id || matched?.id || crypto.randomUUID(),
    name: raw?.name || matched?.name || 'Imported Location',
    visualDescription: raw?.visualDescription || matched?.visualDescription || raw?.description || '',
    period: raw?.period || matched?.period,
    geography: raw?.geography || matched?.geography,
    architecture: raw?.architecture || matched?.architecture,
    atmosphere: raw?.atmosphere || matched?.atmosphere,
  };
}

function normalizeTimeContext(raw: any, existing: TimeContext[]): TimeContext {
  const matched = raw?.id ? existing.find((item) => item.id === raw.id) : findByName(existing, raw);
  return {
    id: raw?.id || matched?.id || crypto.randomUUID(),
    label: raw?.label || raw?.name || matched?.label || 'Imported Time',
    era: raw?.era || matched?.era || '',
    season: raw?.season || matched?.season,
    timeOfDay: raw?.timeOfDay || matched?.timeOfDay || '',
    lighting: raw?.lighting || matched?.lighting || '',
    weather: raw?.weather || matched?.weather,
    historicalNotes: raw?.historicalNotes || matched?.historicalNotes,
  };
}

function normalizePrompt(raw: any, fallbackPinned = false, fallbackSlotId?: string): PromptCard {
  const promptText = raw?.promptText || raw?.prompt || raw?.text || '';
  return {
    id: raw?.id || crypto.randomUUID(),
    label: raw?.label,
    shotType: raw?.shotType || raw?.shot || raw?.type || 'Imported shot',
    summary: raw?.summary || raw?.explanation || 'Imported prompt',
    explanation: raw?.explanation,
    promptText,
    versions: Array.isArray(raw?.versions) && raw.versions.length > 0 ? raw.versions : promptText ? [promptText] : [],
    aspectRatio: raw?.aspectRatio,
    generationType: raw?.generationType,
    revisionPrompt: raw?.revisionPrompt,
    isPinned: raw?.isPinned ?? fallbackPinned,
    isStale: raw?.isStale,
    staleReason: raw?.staleReason,
    slotId: raw?.slotId || fallbackSlotId,
  };
}

function normalizeCameraSlot(raw: any): CameraAngleSlot {
  return {
    id: raw?.id || crypto.randomUUID(),
    label: raw?.label || raw?.shotType || 'Imported angle',
    focalLength: raw?.focalLength || '',
    angleDeg: raw?.angleDeg || raw?.angle || '',
    technique: raw?.technique || '',
    framing: raw?.framing || '',
    rationale: raw?.rationale || '',
    promptId: raw?.promptId || raw?.prompt?.id,
  };
}

function getEmbeddedSlotPrompt(raw: any): any | null {
  const candidate = raw?.prompt || raw?.generatedPrompt || raw?.embeddedPrompt || raw?.promptData;
  if (!candidate) return null;
  const promptText = candidate.promptText || candidate.prompt || candidate.text;
  return promptText ? candidate : null;
}

function mergeImportedPrompt(existingPrompts: PromptCard[], importedPrompt: PromptCard): PromptCard[] {
  const matchIndex = existingPrompts.findIndex((prompt) =>
    prompt.id === importedPrompt.id ||
    (!!prompt.slotId && !!importedPrompt.slotId && prompt.slotId === importedPrompt.slotId) ||
    (!!prompt.promptText && prompt.promptText === importedPrompt.promptText),
  );
  const clearedPins = importedPrompt.isPinned
    ? existingPrompts.map((prompt) => ({ ...prompt, isPinned: false }))
    : existingPrompts;

  if (matchIndex >= 0) {
    return clearedPins.map((prompt, index) => (index === matchIndex ? { ...prompt, ...importedPrompt } : prompt));
  }

  return [...clearedPins, importedPrompt];
}

function normalizeScene(raw: any, existing?: SceneCard): SceneCard {
  const importedAllPrompts = Array.isArray(raw?.allPrompts)
    ? raw.allPrompts.map((prompt: any) => normalizePrompt(prompt))
    : undefined;
  const importedActivePrompt = raw?.activePrompt ? normalizePrompt(raw.activePrompt, true) : undefined;
  const rawCameraSlots = Array.isArray(raw?.cameraSlots)
    ? raw.cameraSlots
    : Array.isArray(raw?.promptSlots)
      ? raw.promptSlots
      : undefined;
  const importedCameraSlots = rawCameraSlots?.map(normalizeCameraSlot);
  const embeddedSlotPrompts = rawCameraSlots && importedCameraSlots
    ? rawCameraSlots
        .map((slot: any, index: number) => {
          const embeddedPrompt = getEmbeddedSlotPrompt(slot);
          if (!embeddedPrompt) return null;

          const normalizedPrompt = normalizePrompt(embeddedPrompt, false, importedCameraSlots[index].id);
          importedCameraSlots[index].promptId = normalizedPrompt.id;
          return normalizedPrompt;
        })
        .filter((prompt): prompt is PromptCard => !!prompt)
    : [];

  let prompts = existing?.prompts || [];
  if (importedAllPrompts) {
    prompts = importedAllPrompts;
  } else if (importedActivePrompt) {
    prompts = mergeImportedPrompt(prompts, importedActivePrompt);
  }

  embeddedSlotPrompts.forEach((prompt) => {
    prompts = mergeImportedPrompt(prompts, prompt);
  });

  const hasPromptData = importedAllPrompts || importedActivePrompt || embeddedSlotPrompts.length > 0;

  return {
    id: raw?.id || existing?.id || crypto.randomUUID(),
    sceneNumber: Number(raw?.sceneNumber || existing?.sceneNumber || 1),
    text: typeof raw?.text === 'string' ? raw.text : existing?.text || '',
    visualNote: typeof raw?.visualNote === 'string' ? raw.visualNote : existing?.visualNote || '',
    visualStyle: normalizeVisualStyle(raw?.visualStyle ?? existing?.visualStyle),
    characterIds: raw?.characterIds ? ensureStringArray(raw.characterIds) : existing?.characterIds || [],
    locationIds: raw?.locationIds ? ensureStringArray(raw.locationIds) : existing?.locationIds || [],
    timeContextIds: raw?.timeContextIds ? ensureStringArray(raw.timeContextIds) : existing?.timeContextIds || [],
    status: raw?.status || (prompts.length > 0 || hasPromptData ? 'ready' : existing?.status || 'analyzed'),
    noteEditable: existing?.noteEditable ?? false,
    prompts,
    analysis: raw?.analysis || existing?.analysis,
    optimizations: raw?.optimizations || existing?.optimizations,
    staleReasons: raw?.staleReasons || existing?.staleReasons,
    promptsNeedRefresh: existing?.promptsNeedRefresh,
    cameraAngleSlots: importedCameraSlots
      ? importedCameraSlots
      : existing?.cameraAngleSlots,
  };
}

function mergeScenes(existingScenes: SceneCard[], importedScenes: any[]): SceneCard[] {
  const next = [...existingScenes];

  importedScenes.forEach((raw) => {
    const matchIndex = next.findIndex((scene) =>
      (raw?.id && scene.id === raw.id) ||
      (raw?.sceneNumber && scene.sceneNumber === Number(raw.sceneNumber)),
    );
    const normalized = normalizeScene(raw, matchIndex >= 0 ? next[matchIndex] : undefined);
    if (matchIndex >= 0) {
      next[matchIndex] = normalized;
    } else {
      next.push(normalized);
    }
  });

  return next.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

function normalizeImportPayload(raw: any, currentState: ReturnType<typeof useAppState>['state']): ImportResult | null {
  const legacyStyle = raw?.style;
  const episodeStyle = raw?.episodeStyle || legacyStyle;
  const entities = raw?.entities;
  const rawScenes = Array.isArray(raw) ? raw : Array.isArray(raw?.scenes) ? raw.scenes : undefined;

  if (!episodeStyle && !entities && !rawScenes) return null;

  const result: ImportResult = {
    importedSceneCount: 0,
    importedPromptCount: 0,
    importedEntityCount: 0,
  };

  if (episodeStyle) {
    if (typeof episodeStyle.en === 'string') result.episodePrompt = episodeStyle.en;
    if (typeof episodeStyle.tr === 'string') result.episodePromptTr = episodeStyle.tr;
  }

  if (entities) {
    if (Array.isArray(entities.characters)) {
      result.characters = entities.characters.map((item: any) => normalizeCharacter(item, currentState.characters));
      result.importedEntityCount += result.characters.length;
    }
    if (Array.isArray(entities.locations)) {
      result.locations = entities.locations.map((item: any) => normalizeLocation(item, currentState.locations));
      result.importedEntityCount += result.locations.length;
    }
    if (Array.isArray(entities.timeContexts)) {
      result.timeContexts = entities.timeContexts.map((item: any) => normalizeTimeContext(item, currentState.timeContexts));
      result.importedEntityCount += result.timeContexts.length;
    }
  }

  if (rawScenes) {
    result.sceneCards = mergeScenes(currentState.sceneCards, rawScenes);
    result.importedSceneCount = rawScenes.length;
    result.importedPromptCount = rawScenes.reduce((total: number, scene: any) => {
      const allPrompts = Array.isArray(scene?.allPrompts) ? scene.allPrompts.length : 0;
      const rawSlots = Array.isArray(scene?.cameraSlots)
        ? scene.cameraSlots
        : Array.isArray(scene?.promptSlots)
          ? scene.promptSlots
          : [];
      const slotPrompts = rawSlots.length > 0
        ? rawSlots.filter((slot: any) => !!getEmbeddedSlotPrompt(slot)).length
        : 0;
      return total + allPrompts + slotPrompts + (scene?.activePrompt && allPrompts === 0 ? 1 : 0);
    }, 0);
  }

  return result;
}

const Index = () => {
  const { id: projectId, episodeId } = useParams<{ id: string; episodeId: string }>();
  const navigate = useNavigate();
  const { state, dispatch, undo, redo } = useAppState();
  const { toast } = useToast();
  const { user } = useAuth();
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [noKeysWarning, setNoKeysWarning] = useState(false);
  const [isWarmed, setIsWarmed] = useState(false);

  const { loadingData, project, episode, loadEpisodeData } = useEpisodeWorkspace({
    projectId,
    episodeId,
    dispatch,
    toast
  });

  const { savingStatus, lastSavedAt, doSave } = useAutosave({
    episodeId,
    state,
    loadingData,
    episode,
    toast
  });
  useEffect(() => {
    if (user?.id) {
      aiProvider.initialize(user.id)
        .then(async () => {
          // Load preferred model from Supabase (cross-device, persistent)
          const savedModel = await fetchUserModel(user.id);
          const modelToUse = savedModel || state.settings.geminiModel || state.settings.model;
          if (savedModel && savedModel !== state.settings.geminiModel) {
            // Supabase has a newer/different model — update local state too
            dispatch({ type: 'SET_SETTINGS', payload: { model: savedModel, geminiModel: savedModel } });
          }
          aiProvider.setModel(modelToUse);
          aiProvider.setGroqModel(state.settings.groqModel);
          aiProvider.setDeepinfraModel(state.settings.deepinfraModel);
          aiProvider.setOpenaiModel(state.settings.openaiModel);
          aiProvider.setAnthropicModel(state.settings.anthropicModel);
          setNoKeysWarning(!aiProvider.hasKeys());

          // DeepInfra warmup sync
          aiProvider.setNotifyStatusChange((status) => setIsWarmed(status));
          setIsWarmed(aiProvider.isWarmedUp());

          // DeepInfra warmup: modeli GPU'da sıcak tut → cold start önle
          aiProvider.startWarmup();
        })
        .catch(err => {
          console.error('Failed to initialize AI provider:', err);
        });
    }
    return () => {
      // Sayfa kapanınca warmup interval'i temizle
      aiProvider.stopWarmup();
    };
  // Only re-initialize when the user ID actually changes, not on every user object re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  // Sync model to aiProvider whenever settings change
  useEffect(() => {
    aiProvider.setModel(state.settings.geminiModel || state.settings.model);
    aiProvider.setGroqModel(state.settings.groqModel);
    aiProvider.setDeepinfraModel(state.settings.deepinfraModel);
    aiProvider.setOpenaiModel(state.settings.openaiModel);
    aiProvider.setAnthropicModel(state.settings.anthropicModel);
  }, [
    state.settings.model,
    state.settings.geminiModel,
    state.settings.groqModel,
    state.settings.deepinfraModel,
    state.settings.openaiModel,
    state.settings.anthropicModel,
  ]);

  // Load episode data from Supabase
  useEffect(() => {
    if (projectId && episodeId) {
      loadEpisodeData();
    }
  }, [projectId, episodeId, loadEpisodeData]);

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [showEntityPanel, setShowEntityPanel] = useState(false);
  const [showEpisodeStylePanel, setShowEpisodeStylePanel] = useState(false);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [isRevisingEpisodeStyle, setIsRevisingEpisodeStyle] = useState(false);
  const [showStyleHistory, setShowStyleHistory] = useState(false);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const [agentCommand, setAgentCommand] = useState('');
  const agent = useAgentSession({
    episodeId,
    userId: user?.id,
  });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const isAgentLocked = agent.isBusy;

  const { handleAddAgentAttachment, handleSubmitAgentCommand, handleApplyAgentChanges } = useAgentActions({
    agent,
    state,
    dispatch,
    toast,
    selectedEntityId,
    agentCommand,
    setAgentCommand,
    setNoKeysWarning,
    episodeId,
  });

  useEffect(() => {
    if (agent.session.open) {
      aiProvider.startWarmup(90_000);
    }
  }, [agent.session.open]);

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
      const tr = await generateEpisodePromptExplanation(revised);
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
  const [isBulkGeneratingPrompts, setIsBulkGeneratingPrompts] = useState(false);
  const [bulkPromptsProgress, setBulkPromptsProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const bulkPromptsAbortRef = useRef<AbortController | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16'>('16:9');
  const stateRef = useRef(state);
  stateRef.current = state;

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

  const handleImportJson = useCallback((fileContent: string) => {
    try {
      const parsedData = JSON.parse(fileContent);
      const normalized = normalizeImportPayload(parsedData, state);

      if (normalized) {
        if (normalized.episodePrompt !== undefined) {
          dispatch({ type: 'SET_EPISODE_PROMPT', payload: normalized.episodePrompt });
        }
        if (normalized.episodePromptTr !== undefined) {
          dispatch({ type: 'SET_EPISODE_PROMPT_TR', payload: normalized.episodePromptTr });
        }
        if (normalized.characters) {
          dispatch({ type: 'SET_CHARACTERS', payload: normalized.characters });
        }
        if (normalized.locations) {
          dispatch({ type: 'SET_LOCATIONS', payload: normalized.locations });
        }
        if (normalized.timeContexts) {
          dispatch({ type: 'SET_TIME_CONTEXTS', payload: normalized.timeContexts });
        }
        if (normalized.sceneCards) {
          dispatch({ type: 'SET_SCENES', payload: normalized.sceneCards });
        }

        toast({
          title: 'JSON ice aktarildi',
          description: `${normalized.importedSceneCount} sahne, ${normalized.importedPromptCount} prompt, ${normalized.importedEntityCount} varlik guncellendi.`,
        });
        return;
      }

      if (!parsedData.scenes || !parsedData.entities) {
        toast({ title: "Geçersiz veya bozuk proje dosyası.", variant: "destructive" });
        return;
      }

      const restoredSceneCards: SceneCard[] = parsedData.scenes.map((s: any) => {
        return {
          id: crypto.randomUUID(),
          sceneNumber: s.sceneNumber,
          text: s.text,
          visualNote: s.visualNote,
          visualStyle: s.visualStyle,
          characterIds: s.characterIds || [],
          locationIds: s.locationIds || [],
          timeContextIds: s.timeContextIds || [],
          status: s.allPrompts && s.allPrompts.length > 0 ? 'ready' : 'analyzed',
          noteEditable: false,
          prompts: (s.allPrompts || []).map((p: any) => ({
            id: crypto.randomUUID(),
            shotType: p.shotType,
            promptText: p.prompt,
            summary: "İçe aktarılmış prompt",
            versions: [p.prompt],
            isPinned: p.isPinned
          }))
        } as SceneCard;
      });

      dispatch({
        type: 'IMPORT_PROJECT',
        payload: {
          episodeId: parsedData.episodeId,
          episodeTitle: parsedData.episodeTitle,
          episodePrompt: parsedData.style?.en || '',
          episodePromptTr: parsedData.style?.tr || '',
          characters: parsedData.entities.characters || [],
          locations: parsedData.entities.locations || [],
          timeContexts: parsedData.entities.timeContexts || [],
          sceneCards: restoredSceneCards,
        }
      });

      toast({ title: "Proje başarıyla içe aktarıldı." });

    } catch (error) {
      console.error("JSON okuma hatası:", error);
      toast({ title: "Dosya okunamadı. Lütfen geçerli bir JSON dosyası seçin.", variant: "destructive" });
    }
  }, [dispatch, state, toast]);

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

  // Two-stage AI workflow handlers
  const handleAnalyzeText = useCallback(async (selectedText: string, targetSceneCount?: number, sourceStartIndex?: number) => {
    console.log('--- ANALYSIS START ---');
    console.log('Target Scene Count (from UI):', targetSceneCount);
    
    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    dispatch({ type: 'START_ANALYSIS' });
    setAnalysisLog([]);

    try {
      const result = await analyzeTextIntoScenes(
        selectedText,
        undefined,
        state.settings.geminiModel || state.settings.model,
        (message: string) => {
          setAnalysisLog(prev => [...prev, message]);
        },
        targetSceneCount
      );
      
      const sceneCards = typeof sourceStartIndex === 'number'
        ? result.sceneCards.map((scene) => ({
          ...scene,
          startIndex: scene.startIndex === undefined ? undefined : scene.startIndex + sourceStartIndex,
          endIndex: scene.endIndex === undefined ? undefined : scene.endIndex + sourceStartIndex,
        }))
        : result.sceneCards;

      const adjustedResult = { ...result, sceneCards };

      console.log('Analysis Result:', adjustedResult.sceneCards.length, 'scenes produced.');
      dispatch({ type: 'FINISH_ANALYSIS', payload: { ...adjustedResult, mode: 'append' } });

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
              adjustedResult.sceneCards
            );
            
            dispatch({ type: 'UPDATE_REFERENCE', payload: { ...ref, assignedSceneIds, aiAnalysis }});
            await updateReferenceAssignments(ref.id, assignedSceneIds, aiAnalysis);
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
          const turkishExplanation = await generateEpisodePromptExplanation(episodePrompt);
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
      dispatch({ type: 'FINISH_ANALYSIS', payload: { sceneCards: [], characters: [], locations: [], mode: 'append' } });
    }
  }, [dispatch, toast, state.references, state.settings.geminiModel, state.settings.model]);

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
        scene.analysis,
        sceneTimeContexts,
        state.episodePrompt || undefined,
        state.references,
        isRegeneration ? 'regenerate' : 'initial',
        () => {
          toast({
            title: '⚠️ Yapay Zeka Yanıtı Onarılıyor',
            description: 'Yapay zeka yanıtı bozuk geldi, otomatik onarım deneniyor...',
          });
        },
        state.projectType,
        state.renderMode
      );
      // Final dispatch with complete result
      dispatch({ 
        type: 'FINISH_PROMPT_GENERATION', 
        payload: { 
          sceneId, 
          prompts: result.prompts,
          analysis: result.analysis,
          cameraAngleSlots: result.cameraAngleSlots,
        } 
      });

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
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.timeContexts, state.projectType, state.renderMode, dispatch, aspectRatio]);

  const handleGenerateSlotPrompt = useCallback(async (sceneId: string, slotId: string) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;
    const slot = scene.cameraAngleSlots?.find(s => s.id === slotId);
    if (!slot) return;

    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    dispatch({ type: 'START_SLOT_PROMPT_GENERATION', payload: { sceneId, slotId } });

    const sceneCharacters = state.characters.filter(c => scene.characterIds.includes(c.id));
    const sceneLocations = state.locations.filter(l => scene.locationIds.includes(l.id));
    const sceneTimeContexts = state.timeContexts.filter(tc => (scene.timeContextIds ?? []).includes(tc.id));

    try {
      const prompt = await generatePromptForSlot(
        scene,
        slot,
        sceneCharacters,
        sceneLocations,
        state.masterPrompt,
        aspectRatio,
        sceneTimeContexts,
        state.episodePrompt || undefined,
        state.references,
        state.projectType,
        state.renderMode
      );
      dispatch({ type: 'FINISH_SLOT_PROMPT_GENERATION', payload: { sceneId, slotId, prompt } });
    } catch (e: any) {
      console.error('Slot prompt generation failed:', e);
      // Revert generation state
      const revertedSlots = (scene.cameraAngleSlots || []).map(s => 
        s.id === slotId ? { ...s, isGenerating: false } : s
      );
      dispatch({ type: 'SET_CAMERA_ANGLE_SLOTS', payload: { sceneId, slots: revertedSlots } });
      toast({
        title: 'Hata',
        description: 'Bu açı için prompt üretilemedi.',
        variant: 'destructive'
      });
    }
  }, [state, dispatch, toast, aspectRatio]);

  const WORKER_COUNT = 4; // Qwen/Llama gibi hızlı modellerde 4 paralel stream verimli


  const handleGenerateAllPrompts = useCallback(async () => {
    if (isBulkGeneratingPrompts) return;

    const scenesWithoutPrompts = stateRef.current.sceneCards.filter(
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
        await new Promise(r => setTimeout(r, 800));
      }
    };

    try {
      // WORKER_COUNT kadar worker paralel çalışır
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
    // Take a snapshot of the current scene IDs BEFORE clearing prompts.
    // This avoids the race condition where dispatch is async and the generator
    // would read stale (already-cleared) state.
    const sceneIds = stateRef.current.sceneCards.map(sc => sc.id);
    if (sceneIds.length === 0) {
      toast({ title: 'Sahne yok', description: 'Önce sahneleri analiz edin.' });
      return;
    }

    // Clear all prompts optimistically
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
      // Pass isRegeneration=true so the generator uses the correct operation type
      await handleGeneratePromptsForScene(sceneId, true);
      done++;
      setBulkPromptsProgress({ done, total: sceneIds.length });
      await new Promise(r => setTimeout(r, 800));
    }

    setIsBulkGeneratingPrompts(false);
    bulkPromptsAbortRef.current = null;
    setBulkPromptsProgress({ done: 0, total: 0 });
  }, [dispatch, handleGeneratePromptsForScene, toast]);



  const handleRegenerateAllPrompts = useCallback(async (sceneId: string, instruction?: string) => {
    const revisionInstruction = instruction?.trim();
    if (!revisionInstruction) {
      await handleGeneratePromptsForScene(sceneId, true);
      return;
    }

    if (!aiProvider.isInitialized() || !aiProvider.hasKeys()) {
      setNoKeysWarning(true);
      return;
    }

    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const slotIndexBySlotId = new Map((scene.cameraAngleSlots ?? []).map((slot, index) => [slot.id, index]));
    const slotIndexByPromptId = new Map(
      (scene.cameraAngleSlots ?? [])
        .filter(slot => !!slot.promptId)
        .map((slot) => [slot.promptId as string, slotIndexBySlotId.get(slot.id) ?? -1])
    );
    const promptSlotIndex = (prompt: PromptCard) => {
      if (prompt.slotId && slotIndexBySlotId.has(prompt.slotId)) return slotIndexBySlotId.get(prompt.slotId);
      return slotIndexByPromptId.get(prompt.id);
    };
    const promptsToRevise = scene.prompts.filter(prompt => {
      const slotIndex = promptSlotIndex(prompt);
      return slotIndex === undefined || slotIndex < 3;
    });

    if (promptsToRevise.length === 0) {
      await handleGeneratePromptsForScene(sceneId, true);
      return;
    }

    dispatch({ type: 'START_PROMPT_GENERATION', payload: { sceneId } });

    try {
      const revisedPromptEntries = await Promise.all(
        promptsToRevise.map(async (prompt): Promise<[string, PromptCard]> => {
          const revised = await revisePrompt(
            prompt.promptText,
            revisionInstruction,
            '',
            state.settings.model,
            state.settings.temperature,
            { existingExplanation: prompt.explanation }
          );

          return [prompt.id, {
            ...prompt,
            id: crypto.randomUUID(),
            promptText: revised.promptText,
            explanation: revised.explanation ?? prompt.explanation,
            versions: [...prompt.versions, revised.promptText],
            generationType: 'revision',
            revisionPrompt: revisionInstruction,
            isPinnedByAI: false,
            pinReason: undefined,
            isStale: false,
            staleReason: undefined,
          }];
        })
      );

      const revisedPromptsById = new Map(revisedPromptEntries);
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: {
          sceneId,
          prompts: scene.prompts.map(prompt => revisedPromptsById.get(prompt.id) ?? prompt),
          analysis: scene.analysis,
          cameraAngleSlots: scene.cameraAngleSlots,
        },
      });
      toast({ title: 'Başarılı', description: 'Promptlar notuna göre hafifçe yenilendi.' });
    } catch (error) {
      console.error('Bulk prompt revision failed:', error);
      dispatch({
        type: 'FINISH_PROMPT_GENERATION',
        payload: {
          sceneId,
          prompts: scene.prompts,
          analysis: scene.analysis,
          cameraAngleSlots: scene.cameraAngleSlots,
        },
      });
      toast({ title: 'Hata', description: 'Promptlar revize edilemedi.', variant: 'destructive' });
    }
  }, [dispatch, handleGeneratePromptsForScene, state.sceneCards, state.settings.model, state.settings.temperature, toast]);

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
        scene.analysis,
        sceneTimeContexts,
        state.episodePrompt || undefined,
        state.references,
        'regenerate',
        () => {
          toast({
            title: '⚠️ Yapay Zeka Yanıtı Onarılıyor',
            description: 'Yapay zeka yanıtı bozuk geldi, otomatik onarım deneniyor...',
          });
        },
        state.projectType,
        state.renderMode
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
  }, [state.sceneCards, state.characters, state.locations, state.masterPrompt, state.timeContexts, state.projectType, state.renderMode, dispatch, aspectRatio]);

  const handleRestoreSceneCardPrompt = useCallback((sceneId: string, entry: any) => {
    const scene = state.sceneCards.find(s => s.id === sceneId);
    if (!scene) return;

    const restoredPrompt: PromptCard = {
      id: crypto.randomUUID(), // Yeni UUID — eski aktif kayıtla çakışmasın
      shotType: entry.shot_type || 'establishing',
      promptText: entry.prompt_text || '',
      summary: entry.summary || 'Önceki versiyondan geri yüklendi',
      explanation: entry.explanation || '',
      aspectRatio: entry.aspect_ratio || '16:9',
      label: entry.label || undefined,
      generationType: 'initial', // geri yüklenen prompt "initial" olarak işaretlenir
      versions: []
    };

    // Aynı shotType + label'a sahip mevcut prompt varsa onu DEĞİŞTİR;
    // yoksa listeye yeni olarak ekle (varyasyon davranışı).
    const existingIdx = scene.prompts.findIndex(
      p =>
        (p.shotType === restoredPrompt.shotType) &&
        ((p.label || '') === (restoredPrompt.label || ''))
    );

    let updatedPrompts: PromptCard[];
    if (existingIdx !== -1) {
      // Aynı tipte bir prompt varsa üzerine yaz
      updatedPrompts = scene.prompts.map((p, i) =>
        i === existingIdx ? restoredPrompt : p
      );
    } else {
      // Yeni tür prompt — ekle
      updatedPrompts = [...scene.prompts, restoredPrompt];
    }

    dispatch({
      type: 'FINISH_PROMPT_GENERATION',
      payload: { sceneId, prompts: updatedPrompts },
    });
    toast({ title: 'Geri Yüklendi', description: 'Önceki prompt versiyonu başarıyla geri yüklendi.' });
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
      const revised = await revisePrompt(
        promptToRevise.promptText,
        instruction,
        '', // apiKey (aiProvider uses its internal key array)
        state.settings.model,
        state.settings.temperature,
        { existingExplanation: promptToRevise.explanation }
      );

      const updatedPrompt: PromptCard = {
        ...promptToRevise,
        id: crypto.randomUUID(), // New UUID so upsert doesn't overwrite the original in DB
        promptText: revised.promptText,
        explanation: revised.explanation ?? promptToRevise.explanation,
        versions: [...promptToRevise.versions, revised.promptText],
        generationType: 'revision',
        revisionPrompt: instruction,
        isPinnedByAI: false,
        pinReason: undefined,
        isStale: false,
        staleReason: undefined,
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

  const handleAddCharacterToSceneCard = useCallback((sceneId: string, characterId: string) => {
    dispatch({ type: 'ADD_CHARACTER_TO_SCENE_CARD', payload: { sceneId, characterId } });
  }, [dispatch]);

  const handleRemoveCharacterFromSceneCard = useCallback((sceneId: string, characterId: string) => {
    dispatch({ type: 'REMOVE_CHARACTER_FROM_SCENE_CARD', payload: { sceneId, characterId } });
  }, [dispatch]);

  const handleAddLocationToSceneCard = useCallback((sceneId: string, locationId: string) => {
    dispatch({ type: 'ADD_LOCATION_TO_SCENE_CARD', payload: { sceneId, locationId } });
  }, [dispatch]);

  const handleRemoveLocationFromSceneCard = useCallback((sceneId: string, locationId: string) => {
    dispatch({ type: 'REMOVE_LOCATION_FROM_SCENE_CARD', payload: { sceneId, locationId } });
  }, [dispatch]);



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
        onExport={() => setExportOpen(true)}
        onImport={handleImportJson}
        onSettings={() => setSettingsOpen(true)}
        onInfo={() => setInfoOpen(true)}
        mainFileName={state.mainFileName}
        disabledActions={isAgentLocked}
      />
      <div className="flex items-center gap-2 px-4 py-1 border-b border-border bg-card">
        <Button
          size="sm"
          variant={agent.session.open ? 'default' : 'outline'}
          className="h-7 text-xs flex items-center gap-2"
          onClick={() => agent.setOpen(!agent.session.open)}
        >
          <div className={`w-2 h-2 rounded-full ${isWarmed ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'}`} />
          🤖 AI Editör
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={async () => {
            const success = await aiProvider.warmup();
            if (success) {
              toast({
                title: "🔥 Sistem Isındı",
                description: `DeepInfra (${aiProvider.getActiveModelName().split('/').pop()}) aktif ve hazır.`,
              });
            } else {
              toast({
                title: "⚠️ Isınma Başarısız",
                description: "DeepInfra'ya ulaşılamadı, otomatik rotasyon devrede.",
                variant: "destructive"
              });
            }
          }}
          title={isWarmed ? "DeepInfra Sıcak (Hazır)" : "DeepInfra Soğuk (Isıtmak için tıkla)"}
        >
          <Flame className={`h-3.5 w-3.5 ${isWarmed ? 'text-orange-500 fill-orange-500/20' : 'text-muted-foreground'}`} />
        </Button>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground bg-zinc-900/50 px-2 py-0.5 rounded border border-white/5">
          <span className="opacity-50">ENGINE:</span>
          <span className={`font-mono ${isWarmed ? 'text-green-400' : 'text-zinc-400'}`}>
            {aiProvider.getProviderName().toUpperCase()} 
            <span className="mx-1 opacity-30">/</span>
            {aiProvider.getActiveModelName().split('/').pop()}
          </span>
        </div>
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

      <input
        ref={mainFileRef}
        type="file"
        accept=".docx,.txt"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFileUpload(file);
          event.target.value = '';
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="story-shot-layout">
          {/* 1. Left Panel (Episode Navigator) */}
          <Panel defaultSize={20} minSize={15}>
            <LeftPanel
              episodes={state.episodes}
              sceneCards={state.sceneCards}
              activeSceneId={state.activeSceneId}
              mainFileName={state.mainFileName || episode?.title || project?.title || ''}
              isAnalyzing={state.isAnalyzing}
              isLoading={loadingData}
              onEpisodeClick={(ep) => setScrollToIndex(ep.startIndex)}
              onSceneClick={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
              onMoveEpisode={(episodeId, newParentId) => dispatch({ type: 'MOVE_EPISODE', payload: { episodeId, newParentId } })}
              onReorderEpisodes={(eps) => dispatch({ type: 'REORDER_EPISODES', payload: eps })}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />

          {/* 2. Middle Section (CenterPanel + Optional Panels + AgentDrawer) */}
          <Panel defaultSize={55} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Top part: Content and Tools */}
              <Panel defaultSize={agent.session.open ? 70 : 100} minSize={20}>
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={50} minSize={20}>
                    <CenterPanel
                      mainText={state.mainText}
                      scenes={state.sceneCards.map(sceneCard => ({
                        id: sceneCard.id,
                        number: sceneCard.sceneNumber,
                        text: sceneCard.text,
                        startIndex: sceneCard.startIndex,
                        endIndex: sceneCard.endIndex,
                      }))}
                      activeSceneId={state.activeSceneId}
                      scrollToIndex={scrollToIndex}
                      onScrollComplete={() => setScrollToIndex(null)}
                      onSetActiveScene={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
                      onAnalyzeText={handleAnalyzeText}
                      isAnalyzing={state.isAnalyzing}
                      isLoading={loadingData}
                      analysisLog={analysisLog}
                    />
                  </Panel>

                  {showEpisodeStylePanel && (
                    <>
                      <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />
                      <Panel defaultSize={25} minSize={15}>
                        <div className={`h-full ${isAgentLocked ? 'pointer-events-none opacity-60' : ''}`}>
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
                            isGeneratingAll={isBulkGeneratingPrompts}
                            sceneCount={state.sceneCards.length}
                            onClose={() => setShowEpisodeStylePanel(false)}
                          />
                        </div>
                      </Panel>
                    </>
                  )}

                  {showEntityPanel && (
                    <>
                      <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />
                      <Panel defaultSize={25} minSize={15}>
                        <div className="flex h-full flex-col border-l border-border bg-card">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                            <span className="text-sm font-medium">🎭 Varlıklar</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowEntityPanel(false)}>✕</Button>
                          </div>
                          <div className={`flex-1 overflow-y-auto scrollbar-thin ${isAgentLocked ? 'pointer-events-none opacity-60' : ''}`}>
                            <EntityCardPanel
                              characters={state.characters}
                              locations={state.locations}
                              timeContexts={state.timeContexts}
                              selectedEntityId={selectedEntityId}
                              onSelectEntity={setSelectedEntityId}
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
                      <Panel defaultSize={25} minSize={15}>
                        <div className="flex h-full flex-col border-l border-border bg-card">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                            <span className="text-sm font-medium">🖼️ Referanslar</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowReferencePanel(false)}>✕</Button>
                          </div>
                          <div className="flex-1 overflow-hidden min-h-0">
                            <ReferencePanel
                              episodeId={episodeId ?? null}
                              references={state.references}
                              sceneCards={state.sceneCards}
                              dispatch={dispatch}
                              disabled={isAgentLocked}
                            />
                          </div>
                        </div>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>

              {/* Bottom part: Agent Drawer (if open) */}
              {agent.session.open && (
                <>
                  <PanelResizeHandle className="h-1 bg-border/40 hover:bg-primary/50 cursor-row-resize transition-colors" />
                  <Panel defaultSize={41} minSize={15}>
                    <div className="h-full overflow-hidden border-t bg-card">
                      <AgentDrawer
                        open={agent.session.open}
                        heightPercent={agent.session.heightPercent}
                        onToggleOpen={() => agent.setOpen(!agent.session.open)}
                        onHeightChange={agent.setHeightPercent}
                        messages={agent.session.messages}
                        attachments={agent.session.attachments}
                        isBusy={agent.isBusy}
                        isStreaming={agent.isStreaming}
                        pendingOperationSet={agent.pendingOperationSet}
                        lastOperationSet={agent.lastOperationSet}
                        activities={agent.activities}
                        command={agentCommand}
                        onCommandChange={setAgentCommand}
                        onSubmit={handleSubmitAgentCommand}
                        sceneCards={state.sceneCards}
                        characters={state.characters}
                        onAddAttachment={handleAddAgentAttachment}
                        onRemoveAttachment={agent.removeAttachment}
                        onApply={handleApplyAgentChanges}
                        onDismissChanges={agent.clearPendingOperationSet}
                      />
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-primary/50 cursor-col-resize transition-colors" />

          {/* 3. Right Panel (Workspace) - Always full height! */}
          <Panel defaultSize={25} minSize={15}>
            <div className={`h-full overflow-hidden ${isAgentLocked ? 'pointer-events-none opacity-60' : ''}`}>
              <RightPanel
                onGenerateAllPrompts={handleGenerateAllPrompts}
                isBulkGeneratingPrompts={isBulkGeneratingPrompts}
                bulkPromptsProgress={bulkPromptsProgress}
                onCancelBulkPrompts={handleCancelBulkPrompts}
                sceneCards={state.sceneCards}
                characters={state.characters}
                locations={state.locations}
                timeContexts={state.timeContexts}
                references={state.references}
                onGeneratePrompts={handleGeneratePromptsForScene}
                onUpdateSceneCardNote={(sceneId, note) => dispatch({ type: 'UPDATE_SCENE_CARD_NOTE', payload: { sceneId, note } })}
                onAddVariation={handleAddVariation}
                onRegenerateAllPrompts_={handleRegenerateAllPrompts}
                onRevisePrompt={handleRevisePrompt_}
                onDeletePrompt={handleDeletePrompt_}
                onRestorePreviousPrompt_={handleRestoreSceneCardPrompt}
                onSetPinnedPrompt={handleSetPinnedPrompt}
                onGenerateSlotPrompt={handleGenerateSlotPrompt}
                onRemoveCharacterFromSceneCard={handleRemoveCharacterFromSceneCard}
                onRemoveLocationFromSceneCard={handleRemoveLocationFromSceneCard}
                onAddCharacterToSceneCard={handleAddCharacterToSceneCard}
                onAddLocationToSceneCard={handleAddLocationToSceneCard}
                onDeleteSceneCard={id => dispatch({ type: 'DELETE_SCENE_CARD', payload: id })}
                isLoading={loadingData}
                onReorderSceneCards={(reordered) => dispatch({ type: 'REORDER_SCENE_CARDS', payload: reordered })}
              />
            </div>
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
        onSaveSettings={s => {
          dispatch({ type: 'SET_SETTINGS', payload: s });
          // Persist model preference to Supabase so it survives across devices/sessions
          if (user?.id && (s.geminiModel || s.model)) {
            saveUserModel(user.id, s.geminiModel || s.model);
          }
        }}
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
        projectTitle={project?.title || 'proje'}
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
import { useAppState } from '@/hooks/useAppState';
import { useEpisodeData } from '@/hooks/useEpisodeData';
import { useGenerationHandlers } from '@/hooks/useGenerationHandlers';
import { parseDocument } from '@/lib/documentParser';
import { parseEpisodes } from '@/lib/contextDetection';
import { aiProvider } from '@/lib/aiProvider';
import { saveUserModel, updateEpisode, fetchUserModel } from '@/lib/supabaseQueries';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PANEL_ENTITY = 'entity';
const PANEL_STYLE = 'style';
const PANEL_REFERENCE = 'reference';

const Index = () => {
  const { id: projectId, episodeId } = useParams<{ id: string; episodeId: string }>();
  const navigate = useNavigate();
  const { state, dispatch, undo, redo } = useAppState();
  const { toast } = useToast();
  const { user } = useAuth();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showEntityPanel, setShowEntityPanel] = useState(false);
  const [showEpisodeStylePanel, setShowEpisodeStylePanel] = useState(false);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [showScriptUploader, setShowScriptUploader] = useState(false);
  const [showStyleHistory, setShowStyleHistory] = useState(false);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16'>('16:9');
  const [noKeysWarning, setNoKeysWarning] = useState(false);

  const mainFileRef = useRef<HTMLInputElement>(null);

  const { loadingData, savingStatus, project, episode, lastSavedAt, doSave } = useEpisodeData({
    projectId,
    episodeId,
    state,
    dispatch,
  });

  const {
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
  } = useGenerationHandlers({
    state,
    dispatch,
    toast,
    aspectRatio,
    projectId,
    setNoKeysWarning,
  });

  useEffect(() => {
    if (!user?.id) return;

    aiProvider.initialize(user.id)
      .then(async () => {
        const savedModel = await fetchUserModel(user.id);
        const modelToUse = savedModel || state.settings.model;
        if (savedModel && savedModel !== state.settings.model) {
          dispatch({ type: 'SET_SETTINGS', payload: { model: savedModel } });
        }
        aiProvider.setModel(modelToUse);
        setNoKeysWarning(!aiProvider.hasKeys());
      })
      .catch(() => {
        // noop
      });
  }, [dispatch, state.settings.model, user?.id]);

  useEffect(() => {
    aiProvider.setModel(state.settings.model);
  }, [state.settings.model]);

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
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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
  }, [redo, undo]);

  const togglePanel = useCallback((panel: string) => {
    setShowEntityPanel(panel === PANEL_ENTITY ? !showEntityPanel : false);
    setShowEpisodeStylePanel(panel === PANEL_STYLE ? !showEpisodeStylePanel : false);
    setShowReferencePanel(panel === PANEL_REFERENCE ? !showReferencePanel : false);
  }, [showEntityPanel, showEpisodeStylePanel, showReferencePanel]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const text = await parseDocument(file);
      dispatch({ type: 'SET_MAIN_TEXT', payload: { text, fileName: file.name } });
      dispatch({ type: 'SET_EPISODES', payload: parseEpisodes(text) });
      if (episodeId) {
        await updateEpisode(episodeId, { document_text: text });
      }
    } catch {
      // noop
    }
  }, [dispatch, episodeId]);

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

  const centerScenes = state.sceneCards.map(scene => ({
    id: scene.id,
    number: scene.sceneNumber,
    text: scene.text,
    startIndex: scene.startIndex,
    endIndex: scene.endIndex,
  }));

  const leftPanelScenes = state.sceneCards.map(scene => ({
    id: scene.id,
    number: scene.sceneNumber,
    text: scene.text,
    title: `Sahne ${scene.sceneNumber}`,
    segments: [{ id: scene.id, text: scene.text, startIndex: scene.startIndex ?? 0, endIndex: scene.endIndex ?? scene.text.length }],
    consistencyGroupIds: [],
  }));

  return (
    <div className="flex h-screen flex-col bg-background">
      {projectId && episodeId && (
        <div className="flex items-center justify-between border-b bg-card px-4 py-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Project
            </Button>
            {episode && (
              <div>
                <span className="text-sm font-medium">{episode.title}</span>
                {project && (
                  <span className="ml-2 text-xs text-muted-foreground">{project.title}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            {savingStatus === 'saving' && (
              <span className="flex items-center gap-2 text-yellow-600">
                <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-yellow-600" />
                Saving...
              </span>
            )}
            {savingStatus === 'saved' && (
              <span className="flex items-center gap-2 text-green-600">
                ✓ Saved
                {lastSavedAt && (
                  <span className="text-xs text-muted-foreground">{lastSavedAt.toLocaleTimeString()}</span>
                )}
              </span>
            )}
            {savingStatus === 'error' && (
              <span className="flex items-center gap-2 text-red-600">
                <span>✗ Kaydetme başarısız</span>
                <button
                  onClick={() => doSave()}
                  className="rounded-md bg-red-600 px-2 py-0.5 text-xs text-white transition-colors hover:bg-red-700"
                >
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

      <div className="flex items-center gap-2 border-b border-border bg-card/50 px-4 py-1">
        <Button
          size="sm"
          variant={showEntityPanel ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => togglePanel(PANEL_ENTITY)}
        >
          🎭 Varlıklar
        </Button>
        <Button
          size="sm"
          variant={showEpisodeStylePanel ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => togglePanel(PANEL_STYLE)}
        >
          🎨 Bölüm Stili
        </Button>
        <Button
          size="sm"
          variant={showReferencePanel ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => togglePanel(PANEL_REFERENCE)}
        >
          🖼️ Referanslar
        </Button>
      </div>

      {noKeysWarning && (
        <div className="flex items-center justify-between border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm">
          <span className="text-yellow-800">⚠️ API anahtarı bulunamadı. Gemini API anahtarlarınızı ekleyin.</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-yellow-400 text-xs text-yellow-800 hover:bg-yellow-100"
              onClick={() => navigate('/settings')}
            >
              Ayarlar Sayfasına Git
            </Button>
            <button className="text-xs text-yellow-600 hover:text-yellow-800" onClick={() => setNoKeysWarning(false)}>✕</button>
          </div>
        </div>
      )}

      <input
        ref={mainFileRef}
        type="file"
        accept=".docx,.txt"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />

      {showScriptUploader && (
        <ScriptUploader
          onComplete={handleScriptComplete}
          onProgress={() => {}}
          onClose={() => setShowScriptUploader(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="story-shot-layout">
          <Panel defaultSize={20} minSize={15}>
            <LeftPanel
              episodes={state.episodes}
              scenes={leftPanelScenes}
              consistencyGroups={[]}
              activeSceneId={state.activeSceneId}
              mainFileName={state.mainFileName}
              isAnalyzing={state.isAnalyzing}
              isLoading={loadingData}
              onEpisodeClick={(ep) => setScrollToIndex(ep.startIndex)}
              onSceneClick={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
              onMoveEpisode={(episodeId_, newParentId) => dispatch({ type: 'MOVE_EPISODE', payload: { episodeId: episodeId_, newParentId } })}
              onReorderEpisodes={(eps) => dispatch({ type: 'REORDER_EPISODES', payload: eps })}
            />
          </Panel>

          <PanelResizeHandle className="w-1 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50" />

          <Panel defaultSize={40} minSize={20}>
            <CenterPanel
              mainText={state.mainText}
              scenes={centerScenes}
              activeSceneId={state.activeSceneId}
              scrollToIndex={scrollToIndex}
              onScrollComplete={() => setScrollToIndex(null)}
              onSetActiveScene={id => dispatch({ type: 'SET_ACTIVE_SCENE', payload: id })}
              onRemoveScene={() => {}}
              onAnalyzeText={handleAnalyzeText}
              isAnalyzing={state.isAnalyzing}
              isLoading={loadingData}
              analysisLog={analysisLog}
            />
          </Panel>

          {showEpisodeStylePanel && (
            <>
              <PanelResizeHandle className="w-1 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50" />
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
                  isGeneratingAll={isBulkGeneratingPrompts}
                  sceneCount={state.sceneCards.length}
                  onClose={() => setShowEpisodeStylePanel(false)}
                />
              </Panel>
            </>
          )}

          {showEntityPanel && (
            <>
              <PanelResizeHandle className="w-1 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50" />
              <Panel defaultSize={20} minSize={15}>
                <div className="flex h-full flex-col border-l border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
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
              <PanelResizeHandle className="w-1 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50" />
              <Panel defaultSize={20} minSize={15}>
                <div className="flex h-full flex-col border-l border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-sm font-medium">🖼️ Referanslar</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowReferencePanel(false)}>✕</Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
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

          <PanelResizeHandle className="w-1 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/50" />

          <Panel defaultSize={25} minSize={15}>
            <RightPanel
              sceneCards={state.sceneCards}
              characters={state.characters}
              locations={state.locations}
              timeContexts={state.timeContexts}
              onGeneratePrompts={handleGeneratePromptsForScene}
              onUpdateSceneCardNote={(sceneId_, note) => dispatch({ type: 'UPDATE_SCENE_CARD_NOTE', payload: { sceneId: sceneId_, note } })}
              onAddVariation={handleAddVariation}
              onRegenerateAllPrompts_={handleRegenerateAllPrompts}
              onRevisePrompt={handleRevisePrompt}
              onDeletePrompt={handleDeletePrompt}
              onRestorePreviousPrompt_={handleRestoreSceneCardPrompt}
              onSetPinnedPrompt={handleSetPinnedPrompt}
              onAddCharacterToSceneCard={handleAddNewCharacterToSceneCard}
              onAddLocationToSceneCard={handleAddNewLocationToSceneCard}
              onDeleteSceneCard={(id) => dispatch({ type: 'DELETE_SCENE_CARD', payload: id })}
              isLoading={loadingData}
              onGenerateAllPrompts={handleGenerateAllPrompts}
              isBulkGeneratingPrompts={isBulkGeneratingPrompts}
              bulkPromptsProgress={bulkPromptsProgress}
              onCancelBulkPrompts={handleCancelBulkPrompts}
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
        onSaveSettings={s => {
          dispatch({ type: 'SET_SETTINGS', payload: s });
          if (user?.id && s.model) {
            saveUserModel(user.id, s.model);
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

      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

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

import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, Wand2, BookOpen, RefreshCw, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { SceneCard, Character, Location, TimeContext } from '@/types';
import type { EntityCatalog, EntityCatalogItem } from '../Types/Entity.types';
import type { RevisionPreviewItem, BulkRevisionJob, BulkRevisionProgress } from '../Types/Revision.types';
import type { ValidationReport } from '../Types/Narrative.types';
import { EntitySelector } from './EntitySelector';
import { RevisionPreview } from './RevisionPreview';
import { ValidationChecklist } from './ValidationChecklist';
import { buildDocumentaryDNA, buildEntityCatalog } from '../RevisionEngine/0_DocumentaryDNA';
import { parseRevisionInstruction } from '../RevisionEngine/1_SemanticParser';
import { profileAllScenes } from '../RevisionEngine/2_UniversalSceneProfiler';
import { buildRoutingMatrix, getAffectedScenes } from '../RevisionEngine/3_RoutingMatrix';
import { createRevisionJob, executeBulkRevision, updateVaultAfterRevision } from '../RevisionEngine/5_ExecutionEngine';
import { validateAllRevisions } from '../RevisionEngine/SafetyValidator';

interface EntityRevisionPanelProps {
  sceneCards: SceneCard[];
  characters: Character[];
  locations: Location[];
  timeContexts: TimeContext[];
  projectId: string;
  episodeId: string;
  episodeTitle: string;
  masterPrompt?: string;
  /** Called when accepted revisions should be applied to the state */
  onApplyRevisions: (revisions: Array<{ sceneId: string; promptId: string; newText: string }>) => void;
  onClose: () => void;
}

// ─── Catalog Build ─────────────────────────────────────────────────────────

function useCatalog(
  sceneCards: SceneCard[],
  characters: Character[],
  locations: Location[],
  timeContexts: TimeContext[],
  projectId: string,
  episodeId: string,
  episodeTitle: string,
  masterPrompt?: string
): EntityCatalog {
  return useMemo(() => {
    const dna = buildDocumentaryDNA(
      projectId,
      episodeId,
      episodeTitle,
      sceneCards,
      characters,
      locations,
      timeContexts,
      masterPrompt
    );
    return buildEntityCatalog(sceneCards, dna.entities);
  }, [sceneCards, characters, locations, timeContexts, projectId, episodeId, episodeTitle, masterPrompt]);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function EntityRevisionPanel({
  sceneCards,
  characters,
  locations,
  timeContexts,
  projectId,
  episodeId,
  episodeTitle,
  masterPrompt,
  onApplyRevisions,
  onClose,
}: EntityRevisionPanelProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [job, setJob] = useState<BulkRevisionJob | null>(null);
  const [progress, setProgress] = useState<BulkRevisionProgress>({
    done: 0,
    total: 0,
    isRunning: false,
  });
  const [previewItems, setPreviewItems] = useState<RevisionPreviewItem[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [catalog, setCatalog] = useState<EntityCatalog | null>(null);
  const [routingSummary, setRoutingSummary] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'setup' | 'preview' | 'validation'>('setup');

  const baseCatalog = useCatalog(
    sceneCards,
    characters,
    locations,
    timeContexts,
    projectId,
    episodeId,
    episodeTitle,
    masterPrompt
  );

  const activeCatalog = catalog ?? baseCatalog;

  const selectedEntity: EntityCatalogItem | null = useMemo(
    () => (selectedEntityId ? (activeCatalog.items.find(i => i.id === selectedEntityId) ?? null) : null),
    [selectedEntityId, activeCatalog]
  );

  const canRun = instruction.trim().length > 0 && !progress.isRunning;

  // ── Run ─────────────────────────────────────────────────────────────────

  const handleRun = useCallback(async () => {
    if (!canRun) return;

    // Parse instruction
    const parsedInstruction = parseRevisionInstruction(
      instruction.trim(),
      activeCatalog,
      selectedEntityId ?? undefined
    );

    // Build scene profiles
    const entityNames = activeCatalog.items.map(i => i.name);
    const timeContextMap: Record<string, string[]> = {};
    for (const sc of sceneCards) {
      const tcLabels = sc.timeContextIds
        ?.map(id => timeContexts.find(tc => tc.id === id)?.label ?? '')
        .filter(Boolean) ?? [];
      timeContextMap[sc.id] = tcLabels;
    }
    const profiles = profileAllScenes(sceneCards, entityNames, timeContextMap);
    const profileMap = new Map(profiles.map(p => [p.sceneId, p]));

    // Build routing matrix
    const matrix = buildRoutingMatrix(parsedInstruction, sceneCards, profiles, activeCatalog);
    setRoutingSummary(matrix.summary);

    // Get affected scenes
    const affectedScenes = getAffectedScenes(matrix, sceneCards);
    const affectedSceneIds = affectedScenes.map(s => s.id);

    if (affectedSceneIds.length === 0) {
      setRoutingSummary('Seçili varlık mevcut sahnelerde bulunamadı. Lütfen başka bir varlık seçin veya talimatı kontrol edin.');
      return;
    }

    // Create and run job
    const newJob = createRevisionJob(parsedInstruction, affectedSceneIds);
    newJob.status = 'running';
    setJob(newJob);
    setProgress({ done: 0, total: 0, isRunning: true });
    setPreviewItems([]);
    setValidationReport(null);

    const decisionMap = new Map(matrix.decisions.map(d => [d.sceneId, d]));

    const results = await executeBulkRevision({
      job: newJob,
      sceneCards,
      profiles: profileMap,
      decisions: decisionMap,
      catalog: activeCatalog,
      onProgress: (p) => {
        setProgress({ done: p.done, total: p.total, isRunning: true, currentSceneId: p.currentSceneId });
      },
      onResult: (result) => {
        const scene = sceneCards.find(s => s.id === result.sceneId);
        const prompt = scene?.prompts.find(p => p.id === result.promptId);
        if (!scene || !prompt) return;

        setPreviewItems(prev => [
          ...prev,
          {
            sceneId: result.sceneId,
            sceneNumber: scene.sceneNumber,
            promptId: result.promptId,
            shotType: prompt.shotType,
            originalText: result.originalText,
            revisedText: result.revisedText,
          },
        ]);
      },
    });

    // Validate
    const report = validateAllRevisions(results, profileMap, matrix);
    setValidationReport(report);

    // Update vault if entity was targeted
    if (parsedInstruction.targetEntityId && results.length > 0) {
      const sampleRevised = results[0].revisedText;
      const updatedCatalog = updateVaultAfterRevision(activeCatalog, newJob, sampleRevised);
      setCatalog(updatedCatalog);
    }

    setProgress({ done: results.length, total: results.length, isRunning: false });
    setJob(prev => prev ? { ...prev, status: 'complete', results } : prev);
    setActiveTab('preview');
  }, [canRun, instruction, activeCatalog, selectedEntityId, sceneCards, timeContexts]);

  // ── Accept / Reject ──────────────────────────────────────────────────────

  const handleAccept = useCallback((sceneId: string, promptId: string) => {
    setPreviewItems(prev =>
      prev.map(item => item.sceneId === sceneId && item.promptId === promptId ? { ...item, accepted: true } : item)
    );
  }, []);

  const handleReject = useCallback((sceneId: string, promptId: string) => {
    setPreviewItems(prev =>
      prev.map(item => item.sceneId === sceneId && item.promptId === promptId ? { ...item, accepted: false } : item)
    );
  }, []);

  const handleAcceptAll = useCallback(() => {
    setPreviewItems(prev => prev.map(item => ({ ...item, accepted: true })));
  }, []);

  const handleRejectAll = useCallback(() => {
    setPreviewItems(prev => prev.map(item => ({ ...item, accepted: false })));
  }, []);

  const handleApply = useCallback(() => {
    const accepted = previewItems.filter(i => i.accepted === true);
    if (accepted.length === 0) return;

    onApplyRevisions(
      accepted.map(item => ({
        sceneId: item.sceneId,
        promptId: item.promptId,
        newText: item.revisedText,
      }))
    );
  }, [previewItems, onApplyRevisions]);

  const acceptedCount = previewItems.filter(i => i.accepted === true).length;
  const isRunning = progress.isRunning;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium">Varlık Revizyonu</span>
          {activeCatalog.items.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {activeCatalog.items.length} varlık
            </Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={onClose}>
          ✕
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as 'setup' | 'preview' | 'validation')}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="shrink-0 mx-3 mt-2">
          <TabsTrigger value="setup" className="text-[11px] flex-1">
            🎯 Kurulum
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-[11px] flex-1" disabled={previewItems.length === 0}>
            👁️ Önizleme {previewItems.length > 0 && `(${previewItems.length})`}
          </TabsTrigger>
          <TabsTrigger value="validation" className="text-[11px] flex-1" disabled={!validationReport}>
            ✅ Doğrulama
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="flex-1 overflow-y-auto px-3 pb-3 space-y-4 mt-2">
          {/* Entity Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-violet-400/80 mb-2 block">
              1. Varlık Seç (İsteğe Bağlı)
            </label>
            <p className="text-[10px] text-muted-foreground/70 mb-2 leading-tight">
              Belirli bir varlığı seçerseniz, revizyon yalnızca o varlığın geçtiği sahnelere uygulanır. Seçmezseniz tüm sahnelere uygulanır.
            </p>
            {activeCatalog.items.length > 0 ? (
              <EntitySelector
                items={activeCatalog.items}
                selectedId={selectedEntityId}
                onSelect={setSelectedEntityId}
                onClear={() => setSelectedEntityId(null)}
              />
            ) : (
              <div className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-3 text-center">
                Varlık kataloğu oluşturulamadı. Sahnelere karakter veya mekan ekleyin.
              </div>
            )}
          </div>

          {/* Selected entity info */}
          {selectedEntity && (
            <div className="rounded-md border border-violet-800/40 bg-violet-950/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-300">{selectedEntity.name}</span>
                <Badge variant="outline" className="text-[10px] border-violet-700 text-violet-400">
                  {selectedEntity.appearances.length} sahne
                </Badge>
              </div>
              <p className="text-[11px] text-violet-200/70 line-clamp-2">
                {selectedEntity.canonicalDescription}
              </p>
              <p className="text-[10px] text-violet-400/60">
                Tip: {selectedEntity.type}
                {selectedEntity.tags.includes('spiritual') && ' · Ruhani varlık'}
              </p>
            </div>
          )}

          {/* Instruction */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-violet-400/80 mb-2 block">
              2. Revizyon Talimatı
            </label>
            <textarea
              className="w-full text-xs min-h-[100px] resize-none rounded-md border border-violet-800/40 bg-violet-950/20 px-3 py-2 text-violet-100 placeholder:text-violet-700/50 focus:outline-none focus:ring-1 focus:ring-violet-500 scrollbar-thin disabled:opacity-50"
              placeholder="Örn: Bu mimariyi daha sofistike göster, taş işçiliğini vurgula…&#10;Örn: Daha grimsi tonlar, soğuk renkler&#10;Örn: Soyut varlıkların yüzlerini gösterme, sadece siluet"
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              disabled={isRunning}
            />
          </div>

          {/* Routing preview */}
          {routingSummary && (
            <div className="rounded-md bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
              📊 {routingSummary}
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="flex items-center gap-2 text-[11px] text-violet-400/80">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                {progress.done} / {progress.total} prompt revize edildi…
              </span>
            </div>
          )}

          {/* Run button */}
          <Button
            className="w-full gap-2 bg-violet-700 hover:bg-violet-600 text-white text-xs disabled:opacity-50"
            onClick={handleRun}
            disabled={!canRun}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Revize ediliyor…
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                {selectedEntity
                  ? `"${selectedEntity.name}" Varlığını Revize Et`
                  : 'Tüm Sahneleri Revize Et'}
              </>
            )}
          </Button>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
          {previewItems.length > 0 ? (
            <div className="space-y-4">
              <RevisionPreview
                items={previewItems}
                onAccept={handleAccept}
                onReject={handleReject}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
              />

              {acceptedCount > 0 && (
                <Button
                  className="w-full gap-2 bg-green-700 hover:bg-green-600 text-xs"
                  onClick={handleApply}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {acceptedCount} Revizyonu Uygula
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Önce kurulum sekmesinden revizyon başlatın.
            </div>
          )}
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
          {validationReport ? (
            <ValidationChecklist
              report={validationReport}
              onDismissWarning={() => {}}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Doğrulama raporu henüz mevcut değil.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

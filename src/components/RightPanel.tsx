import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Zap, StickyNote, GripVertical, Download, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PromptCard } from './PromptCard';
import { SceneCard } from './SceneCard';
import type { Scene, ConsistencyGroup, ExtractedEntity, SceneAnalysis, SceneCard as SceneCardType, Character, Location, SceneReference } from '@/types';

interface RightPanelProps {
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
  activeSceneId: string | null;
  extractedEntities?: ExtractedEntity[];
  sceneAnalyses?: Record<string, SceneAnalysis>;
  onGenerate: (sceneId: string) => void;
  onCancel?: (sceneId: string) => void;
  onCancelAll?: () => void;
  onGenerateAll: () => void;
  isGeneratingAll?: boolean;
  onRevise: (sceneId: string, promptId: string, instruction: string) => void;
  onRefreshAll: (sceneId: string) => void;
  onSetActiveScene: (id: string) => void;
  onRemoveScene: (id: string) => void;
  onRegenerateGroup?: (groupId: string) => void;
  onAddSceneToGroup?: (sceneId: string, groupId: string | null) => void;
  onRemoveSceneFromGroup?: (sceneId: string, groupId: string) => void;
  onAttachEntity?: (sceneId: string, promptId: string, entityId: string) => void;
  onDetachEntity?: (sceneId: string, promptId: string, entityId: string) => void;
  onSetSceneNote?: (sceneId: string, note: string) => void;
  onSetGroupNote?: (groupId: string, note: string) => void;
  // Sub-scene callbacks
  onAddSubScene?: (sceneId: string, label: string) => void;
  onRemoveSubScene?: (sceneId: string, subSceneId: string) => void;
  onGenerateSubScene?: (sceneId: string, subSceneId: string) => void;
  onReviseSubScene?: (sceneId: string, subSceneId: string, promptId: string, instruction: string) => void;
  onRefreshSubScene?: (sceneId: string, subSceneId: string) => void;
  onDeleteSubScenePrompt?: (sceneId: string, subSceneId: string, promptId: string) => void;
  onSetSubSceneNote?: (sceneId: string, subSceneId: string, note: string) => void;
  onAddSubSceneToGroup?: (sceneId: string, subSceneId: string, groupId: string | null) => void;
  onRemoveSubSceneFromGroup?: (sceneId: string, subSceneId: string, groupId: string) => void;
  onReorderScenes?: (scenes: Scene[]) => void;
  onReorderSceneCards?: (sceneCards: SceneCardType[]) => void;
  // Two-stage AI workflow
  sceneCards?: SceneCardType[];
  characters?: Character[];
  locations?: Location[];
  timeContexts?: import('@/types').TimeContext[];
  references?: SceneReference[];
  isGeneratingPrompts?: boolean;
  onGeneratePrompts?: (sceneId: string) => void;
  onGenerateAllPrompts?: () => void;
  onDeleteSceneCard?: (sceneId: string) => void;
  onUpdateSceneCardNote?: (sceneId: string, note: string) => void;
  onRemoveCharacterFromSceneCard?: (sceneId: string, characterId: string) => void;
  onRemoveLocationFromSceneCard?: (sceneId: string, locationId: string) => void;
  onAddCharacterToSceneCard?: (sceneId: string, characterId: string) => void;
  onAddLocationToSceneCard?: (sceneId: string, locationId: string) => void;
  onAddTimeContextToSceneCard?: (sceneId: string, timeContextId: string) => void;
  onRemoveTimeContextFromSceneCard?: (sceneId: string, timeContextId: string) => void;
  onAddVariation?: (sceneId: string) => void;
  onRegenerateAllPrompts_?: (sceneId: string) => void;
  onRevisePrompt?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDeletePrompt?: (sceneId: string, promptId: string) => void;
  onRestorePreviousPrompt_?: (sceneId: string, entry: any) => void;
  isBulkGeneratingPrompts?: boolean;
  bulkPromptsProgress?: { done: number; total: number };
  onCancelBulkPrompts?: () => void;
  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
  onGenerateSlotPrompt?: (sceneId: string, slotId: string) => void;
  isLoading?: boolean;
}

function GroupNoteEditor({ group, onSave }: { group: ConsistencyGroup; onSave: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(group.note || '');

  const handleSave = () => {
    onSave(text);
    setOpen(false);
  };

  return (
    <div className="rounded-md border border-border bg-secondary/30 overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary transition-colors"
        onClick={() => { setOpen(p => !p); setText(group.note || ''); }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Grup {group.label}</span>
          {group.note && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">— {group.note}</span>
          )}
        </div>
        <StickyNote className={`h-3.5 w-3.5 shrink-0 ${group.note ? 'text-yellow-400' : 'text-muted-foreground/40'}`} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 space-y-2 bg-card" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] text-muted-foreground">Bu grup notunu yapay zeka da görecek (ör: "Gün batımı ışığı", "İç mekan")</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Grup için görsel tutarlılık notu..."
            className="w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Kaydet</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>İptal</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RightPanel({
  scenes, consistencyGroups, activeSceneId,
  extractedEntities, sceneAnalyses,
  onGenerate, onCancel, onCancelAll, onGenerateAll, isGeneratingAll, onRevise, onRefreshAll,
  onSetActiveScene, onRemoveScene, onRegenerateGroup,
  onAddSceneToGroup, onRemoveSceneFromGroup, onAttachEntity, onDetachEntity, onSetSceneNote, onSetGroupNote,
  onAddSubScene, onRemoveSubScene, onGenerateSubScene, onReviseSubScene, onRefreshSubScene,
  onDeleteSubScenePrompt, onSetSubSceneNote,
  onAddSubSceneToGroup, onRemoveSubSceneFromGroup,
  onReorderScenes, onReorderSceneCards,
  sceneCards = [], characters = [], locations = [], timeContexts = [],
  references = [],
  isGeneratingPrompts, onGeneratePrompts, onGenerateAllPrompts, onDeleteSceneCard,
  onUpdateSceneCardNote, onRemoveCharacterFromSceneCard, onRemoveLocationFromSceneCard,
  onAddCharacterToSceneCard, onAddLocationToSceneCard,
  onAddTimeContextToSceneCard, onRemoveTimeContextFromSceneCard,
  onAddVariation, onRegenerateAllPrompts_, onRevisePrompt, onDeletePrompt, onRestorePreviousPrompt_,
  isBulkGeneratingPrompts, bulkPromptsProgress, onCancelBulkPrompts,
  onSetPinnedPrompt, onGenerateSlotPrompt,
  isLoading,
}: RightPanelProps) {
  const doneCount = scenes.filter(s => s.status === 'done').length;
  const pendingCount = scenes.filter(s => s.status === 'pending').length;
  const generatingCount = scenes.filter(s => s.status === 'generating').length;
  const totalScenes = scenes.length;
  const hasSequentialSceneCardNumbers = sceneCards.every((sceneCard, index) => sceneCard.sceneNumber === index + 1);
  const bulkPromptsPercent = bulkPromptsProgress && bulkPromptsProgress.total > 0
    ? Math.round((bulkPromptsProgress.done / bulkPromptsProgress.total) * 100)
    : 0;

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Performance optimizations for entity lookups (Fixes Bug #7)
  const charMap = React.useMemo(() => new Map(characters.map(c => [c.id, c])), [characters]);
  const locMap = React.useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);
  const timeMap = React.useMemo(() => new Map(timeContexts.map(tc => [tc.id, tc])), [timeContexts]);

  // Drag-and-drop state for sceneCards
  const dragSceneCardIndexRef = useRef<number | null>(null);
  const [dragOverSceneCardIndex, setDragOverSceneCardIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverIndex(null);
      dragIndexRef.current = null;
      return;
    }
    const reordered = [...scenes];
    const [moved] = reordered.splice(fromIndex, 1);
    
    reordered.splice(dropIndex, 0, moved);

    // Use float averaging to avoid integer collisions and unique constraint errors in DB
    const prevNumber = dropIndex > 0 ? reordered[dropIndex - 1].number : 0;
    const nextNumber = dropIndex < reordered.length - 1 ? reordered[dropIndex + 1].number : prevNumber + 2;
    moved.number = (prevNumber + nextNumber) / 2;

    onReorderScenes?.(reordered);
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, [scenes, onReorderScenes]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, []);

  const handleSceneCardDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragSceneCardIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleSceneCardDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSceneCardIndex(index);
  }, []);

  const handleSceneCardDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragSceneCardIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverSceneCardIndex(null);
      dragSceneCardIndexRef.current = null;
      return;
    }
    const reordered = [...sceneCards];
    const [moved] = reordered.splice(fromIndex, 1);

    reordered.splice(dropIndex, 0, moved);

    // Use float averaging to avoid integer collisions and unique constraint errors in DB
    const prevNumber = dropIndex > 0 ? reordered[dropIndex - 1].sceneNumber : 0;
    const nextNumber = dropIndex < reordered.length - 1 ? reordered[dropIndex + 1].sceneNumber : prevNumber + 2;
    moved.sceneNumber = (prevNumber + nextNumber) / 2;

    onReorderSceneCards?.(reordered);
    setDragOverSceneCardIndex(null);
    dragSceneCardIndexRef.current = null;
  }, [sceneCards, onReorderSceneCards]);

  const handleSceneCardDragEnd = useCallback(() => {
    setDragOverSceneCardIndex(null);
    dragSceneCardIndexRef.current = null;
  }, []);

  const handleRenumberSceneCards = useCallback(() => {
    if (!onReorderSceneCards) return;

    const renumbered = sceneCards.map((sceneCard, index) => ({
      ...sceneCard,
      sceneNumber: index + 1,
    }));

    onReorderSceneCards(renumbered);
  }, [sceneCards, onReorderSceneCards]);

  return (
    <div className="flex h-full flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Çalışma Alanı</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-semibold text-foreground">Sahneler</span>
            {(scenes.length > 0 || sceneCards.length > 0) && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium bg-primary/10 text-primary border-none">
                {scenes.length + sceneCards.length}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {sceneCards.length > 0 && onReorderSceneCards && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={handleRenumberSceneCards}
              disabled={hasSequentialSceneCardNumbers}
              title={hasSequentialSceneCardNumbers ? 'Sahne numaralari zaten sirali' : 'Scene card numaralarini yeniden sirala'}
            >
              <Hash className="mr-1.5 h-3.5 w-3.5" />
              Numaralari Duzelt
            </Button>
          )}
          
          {isGeneratingAll ? (
            <Button size="sm" variant="destructive" className="h-8 px-3 text-xs animate-pulse" onClick={onCancelAll}>
              İptal Et
            </Button>
          ) : pendingCount > 0 ? (
            <Button size="sm" className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20" onClick={onGenerateAll}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Tümünü Üret
            </Button>
          ) : onGenerateAllPrompts && sceneCards.length > 0 ? (
            isBulkGeneratingPrompts ? (
              <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-2 py-1 border border-border/50">
                <div className="flex flex-col gap-1 min-w-[100px]">
                  <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                    <span>Üretiliyor...</span>
                    <span>%{bulkPromptsPercent}</span>
                  </div>
                  <div className="relative w-full bg-background/50 rounded-full h-1 overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${bulkPromptsPercent}%` }}
                    />
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive rounded-full" onClick={onCancelBulkPrompts}>
                  <span className="text-lg leading-none">×</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 border-none group"
                disabled={isGeneratingPrompts}
                onClick={onGenerateAllPrompts}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5 fill-current group-hover:animate-pulse" />
                Toplu Prompt Üret
              </Button>
            )
          ) : null}
        </div>
      </div>

      {/* Bulk generation progress */}
      {isGeneratingAll && totalScenes > 0 && (
        <div className="border-b px-4 py-2 bg-primary/5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-primary font-medium">
              ⚡ {doneCount}/{totalScenes} sahne işlendi
              {generatingCount > 0 && ` · ${generatingCount} üretiliyor`}
            </span>
            <span className="text-muted-foreground">{Math.round((doneCount / totalScenes) * 100)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${(doneCount / totalScenes) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Consistency Group Notes */}
      {consistencyGroups.length > 0 && onSetGroupNote && (
        <div className="border-b px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tutarlılık Grubu Notları</p>
          {consistencyGroups.map(g => (
            <GroupNoteEditor key={g.id} group={g} onSave={(note) => onSetGroupNote(g.id, note)} />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {isLoading ? (
          <div className="space-y-4 px-1 py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-3 border rounded-xl p-4 bg-card/50">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-16 w-full bg-muted/40 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-muted/60 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-muted/60 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : scenes.length === 0 && sceneCards.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground animate-in slide-in-from-bottom-2 duration-500">
            <div className="relative mb-5">
              <div className="absolute -inset-3 rounded-full bg-primary/20 blur animate-pulse"></div>
              <div className="relative bg-card rounded-2xl p-4 border border-border shadow-md">
                <Zap className="h-8 w-8 text-primary opacity-80" />
              </div>
            </div>
            <p className="font-medium text-foreground text-base">Henüz sahne eklenmedi</p>
            <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed">
              Sol panelden metni analiz ederek veya manuel seçim yaparak AI ile sahnelerinizi oluşturmaya başlayın.
            </p>
          </div>
        ) : (
          <>
            {scenes.map((scene, i) => {
              const groups = scene.consistencyGroupIds?.map(gId => consistencyGroups.find(g => g.id === gId)).filter(Boolean) as ConsistencyGroup[] || [];
              const analysis = sceneAnalyses?.[scene.id];
              return (
                <div
                  key={scene.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`relative transition-all ${dragOverIndex === i ? 'border-t-2 border-primary pt-1' : ''}`}
                >
                  {/* Narrative type badge */}
                  {analysis && analysis.narrativeType !== 'static' && (
                    <div className="flex gap-1 mb-1 ml-5">
                      {analysis.narrativeType === 'timelapse' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-700 border-amber-300 bg-amber-50">
                          🎬 Timelapse
                        </Badge>
                      )}
                      {analysis.narrativeType === 'sequence' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-700 border-blue-300 bg-blue-50">
                          📽️ Dizi
                        </Badge>
                      )}
                      {analysis.suggestedPromptCount > 1 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-700 border-purple-300 bg-purple-50">
                          🎬 {analysis.suggestedPromptCount} kare önerildi
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <div className="flex items-start pt-3 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                <PromptCard
                  key={scene.id}
                  sceneId={scene.id}
                  sceneIndex={i + 1}
                  episodeTitle={scene.episodeTitle}
                  sceneText={scene.segments.map(s => s.text).join(' ')}
                  referenceText={scene.subjectReferences.length > 0 ? scene.subjectReferences.map(r => r.text).join(' ') : undefined}
                  prompts={scene.prompts}
                  status={scene.status}
                  consistencyGroups={groups}
                  allConsistencyGroups={consistencyGroups}
                  note={scene.note}
                  subScenes={scene.subScenes || []}
                  allEntities={extractedEntities || []}
                  isActive={activeSceneId === scene.id}
                  onGenerate={() => onGenerate(scene.id)}
                  onCancel={onCancel ? () => onCancel(scene.id) : undefined}
                  onRevise={(promptId, instruction) => onRevise(scene.id, promptId, instruction)}
                  onRefreshAll={() => onRefreshAll(scene.id)}
                  onDelete={() => onRemoveScene(scene.id)}
                  onDeletePrompt={onDeletePrompt ? (promptId) => onDeletePrompt(scene.id, promptId) : undefined}
                  onAttachEntity={onAttachEntity ? (promptId, entityId) => onAttachEntity(scene.id, promptId, entityId) : undefined}
                  onDetachEntity={onDetachEntity ? (promptId, entityId) => onDetachEntity(scene.id, promptId, entityId) : undefined}
                  onRegenerateGroup={groups.length > 0 ? () => onRegenerateGroup?.(groups[0]!.id) : undefined}
                  onAddToGroup={onAddSceneToGroup ? (groupId) => onAddSceneToGroup(scene.id, groupId) : undefined}
                  onRemoveFromGroup={onRemoveSceneFromGroup ? (groupId) => onRemoveSceneFromGroup(scene.id, groupId) : undefined}
                  onSetNote={onSetSceneNote ? (note) => onSetSceneNote(scene.id, note) : undefined}
                  onAddSubScene={onAddSubScene ? (label) => onAddSubScene(scene.id, label) : undefined}
                  onRemoveSubScene={onRemoveSubScene ? (subSceneId) => onRemoveSubScene(scene.id, subSceneId) : undefined}
                  onGenerateSubScene={onGenerateSubScene ? (subSceneId) => onGenerateSubScene(scene.id, subSceneId) : undefined}
                  onReviseSubScene={onReviseSubScene ? (subSceneId, promptId, instruction) => onReviseSubScene(scene.id, subSceneId, promptId, instruction) : undefined}
                  onRefreshSubScene={onRefreshSubScene ? (subSceneId) => onRefreshSubScene(scene.id, subSceneId) : undefined}
                  onDeleteSubScenePrompt={onDeleteSubScenePrompt ? (subSceneId, promptId) => onDeleteSubScenePrompt(scene.id, subSceneId, promptId) : undefined}
                  onSetSubSceneNote={onSetSubSceneNote ? (subSceneId, note) => onSetSubSceneNote(scene.id, subSceneId, note) : undefined}
                  onAddSubSceneToGroup={onAddSubSceneToGroup ? (subSceneId, groupId) => onAddSubSceneToGroup(scene.id, subSceneId, groupId) : undefined}
                  onRemoveSubSceneFromGroup={onRemoveSubSceneFromGroup ? (subSceneId, groupId) => onRemoveSubSceneFromGroup(scene.id, subSceneId, groupId) : undefined}
                  onClick={() => onSetActiveScene(scene.id)}
                />
                    </div>
                  </div>
                </div>
              );
            })}

            {sceneCards.map((sc, i) => {
              const sceneChars = sc.characterIds.map(id => charMap.get(id)).filter(Boolean) as Character[];
              const sceneLocs = sc.locationIds.map(id => locMap.get(id)).filter(Boolean) as Location[];
              const sceneTimeContexts = (sc.timeContextIds ?? []).map(id => timeMap.get(id)).filter(Boolean) as import('@/types').TimeContext[];
              const sceneReferences = references.filter(ref => ref.assignedSceneIds?.includes(sc.id));
              return (
                <div
                  key={sc.id}
                  draggable
                  onDragStart={(e) => handleSceneCardDragStart(e, i)}
                  onDragOver={(e) => handleSceneCardDragOver(e, i)}
                  onDrop={(e) => handleSceneCardDrop(e, i)}
                  onDragEnd={handleSceneCardDragEnd}
                  className={`relative transition-all ${dragOverSceneCardIndex === i ? 'border-t-2 border-primary pt-1' : ''}`}
                >
                  <div className="flex gap-1">
                    <div className="flex items-start pt-3 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                {sc.promptsNeedRefresh && (
                  <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-600">
                    Agent degisikligi uygulandi. Bu sahnedeki promptlar yeniden uretilmeli.
                  </div>
                )}
                <SceneCard
                  scene={sc}
                  characters={sceneChars}
                  locations={sceneLocs}
                  availableCharacters={characters}
                  availableLocations={locations}
                  timeContexts={sceneTimeContexts}
                  references={sceneReferences}
                  onUpdateNote={onUpdateSceneCardNote || (() => {})}
                  onGeneratePrompts={onGeneratePrompts || (() => {})}
                  onDeleteScene={onDeleteSceneCard || (() => {})}
                  onRemoveCharacter={onRemoveCharacterFromSceneCard || (() => {})}
                  onRemoveLocation={onRemoveLocationFromSceneCard || (() => {})}
                  onAddCharacter={onAddCharacterToSceneCard}
                  onAddLocation={onAddLocationToSceneCard}
                  onAddTimeContext={onAddTimeContextToSceneCard}
                  onRemoveTimeContext={onRemoveTimeContextFromSceneCard}
                  onAddVariation={onAddVariation}
                  onRegenerateAll={onRegenerateAllPrompts_}
                  onRevisePrompt={onRevisePrompt}
                  onDeletePrompt={onDeletePrompt}
                  onRestorePreviousPrompt={onRestorePreviousPrompt_}
                  onSetPinnedPrompt={onSetPinnedPrompt}
                  onGenerateSlotPrompt={onGenerateSlotPrompt}
                  isBulkGenerating={isBulkGeneratingPrompts}
                />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Zap, StickyNote, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptCard } from './PromptCard';
import { SceneCard } from './SceneCard';
import type { Scene, ConsistencyGroup, ExtractedEntity, SceneAnalysis, SceneCard as SceneCardType, Character, Location } from '@/types';

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
  onGenerateImage?: (sceneId: string, promptId: string) => void;
  onSetActiveScene: (id: string) => void;
  onRemoveScene: (id: string) => void;
  onRegenerateGroup?: (groupId: string) => void;
  onAddSceneToGroup?: (sceneId: string, groupId: string | null) => void;
  onRemoveSceneFromGroup?: (sceneId: string, groupId: string) => void;
  onDeletePrompt?: (sceneId: string, promptId: string) => void;
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
  onGenerateSubSceneImage?: (sceneId: string, subSceneId: string, promptId: string) => void;
  onAddSubSceneToGroup?: (sceneId: string, subSceneId: string, groupId: string | null) => void;
  onRemoveSubSceneFromGroup?: (sceneId: string, subSceneId: string, groupId: string) => void;
  onReorderScenes?: (scenes: Scene[]) => void;
  // Two-stage AI workflow
  sceneCards?: SceneCardType[];
  characters?: Character[];
  locations?: Location[];
  isGeneratingPrompts?: boolean;
  onGeneratePrompts?: (sceneId: string) => void;
  onGenerateAllPrompts?: () => void;
  onDeleteSceneCard?: (sceneId: string) => void;
  onUpdateSceneCardNote?: (sceneId: string, note: string) => void;
  onRemoveCharacterFromSceneCard?: (sceneId: string, characterId: string) => void;
  onRemoveLocationFromSceneCard?: (sceneId: string, locationId: string) => void;
  onAddVariation?: (sceneId: string) => void;
  onRegenerateAllPrompts_?: (sceneId: string) => void;
  onRevisePrompt_?: (sceneId: string, promptId: string) => void;
  onDeletePrompt_?: (sceneId: string, promptId: string) => void;
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
  onGenerate, onCancel, onCancelAll, onGenerateAll, isGeneratingAll, onRevise, onRefreshAll, onGenerateImage,
  onSetActiveScene, onRemoveScene, onRegenerateGroup,
  onAddSceneToGroup, onRemoveSceneFromGroup, onDeletePrompt, onAttachEntity, onDetachEntity, onSetSceneNote, onSetGroupNote,
  onAddSubScene, onRemoveSubScene, onGenerateSubScene, onReviseSubScene, onRefreshSubScene,
  onDeleteSubScenePrompt, onSetSubSceneNote, onGenerateSubSceneImage,
  onAddSubSceneToGroup, onRemoveSubSceneFromGroup,
  onReorderScenes,
  sceneCards = [], characters = [], locations = [],
  isGeneratingPrompts, onGeneratePrompts, onGenerateAllPrompts, onDeleteSceneCard,
  onUpdateSceneCardNote, onRemoveCharacterFromSceneCard, onRemoveLocationFromSceneCard,
  onAddVariation, onRegenerateAllPrompts_, onRevisePrompt_, onDeletePrompt_,
}: RightPanelProps) {
  const doneCount = scenes.filter(s => s.status === 'done').length;
  const pendingCount = scenes.filter(s => s.status === 'pending').length;

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    // Update scene numbers
    const renumbered = reordered.map((s, i) => ({ ...s, number: i + 1 }));
    onReorderScenes?.(renumbered);
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, [scenes, onReorderScenes]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, []);

  return (
    <div className="flex h-full flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Promptlar</h2>
          {scenes.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{doneCount} / {scenes.length} tamamlandı</p>
          )}
        </div>
        <div className="flex gap-1.5">
          {isGeneratingAll ? (
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onCancelAll}>
              <span className="mr-1">✕</span>
              Toplu Üretimi İptal Et
            </Button>
          ) : pendingCount > 0 ? (
            <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={onGenerateAll}>
              <Sparkles className="mr-1 h-3 w-3" />
              Tümünü Üret ({pendingCount})
            </Button>
          ) : null}
        </div>
      </div>

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
        {scenes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            <div>
              <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p>Henüz sahne eklenmedi</p>
              <p className="mt-1 text-xs">Metinden seçim yaparak sahne oluşturun</p>
            </div>
          </div>
        ) : (
          scenes.map((scene, i) => {
            const groups = scene.consistencyGroupIds?.map(gId => consistencyGroups.find(g => g.id === gId)).filter(Boolean) as ConsistencyGroup[] || [];
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
                <div className="flex gap-1">
                  <div className="flex items-start pt-3 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
              <PromptCard
                key={scene.id}
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
                onGenerateImage={onGenerateImage ? (promptId) => onGenerateImage(scene.id, promptId) : undefined}
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
                onGenerateSubSceneImage={onGenerateSubSceneImage ? (subSceneId, promptId) => onGenerateSubSceneImage(scene.id, subSceneId, promptId) : undefined}
                onAddSubSceneToGroup={onAddSubSceneToGroup ? (subSceneId, groupId) => onAddSubSceneToGroup(scene.id, subSceneId, groupId) : undefined}
                onRemoveSubSceneFromGroup={onRemoveSubSceneFromGroup ? (subSceneId, groupId) => onRemoveSubSceneFromGroup(scene.id, subSceneId, groupId) : undefined}
                onClick={() => onSetActiveScene(scene.id)}
              />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Two-stage AI workflow: Scene Cards section */}
      {sceneCards.length > 0 && (
        <>
          <div className="border-t border-b px-4 py-3 bg-muted/20 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Sahneleri ({sceneCards.length})
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {sceneCards.filter(sc => sc.prompts.length > 0).length} sahne hazır
              </p>
            </div>
            {onGenerateAllPrompts && (
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={isGeneratingPrompts}
                onClick={onGenerateAllPrompts}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Tümü İçin Prompt Üret
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {sceneCards.map(sc => {
              const sceneChars = characters.filter(c => sc.characterIds.includes(c.id));
              const sceneLocs = locations.filter(l => sc.locationIds.includes(l.id));
              return (
                <SceneCard
                  key={sc.id}
                  scene={sc}
                  characters={sceneChars}
                  locations={sceneLocs}
                  onUpdateNote={onUpdateSceneCardNote || (() => {})}
                  onGeneratePrompts={onGeneratePrompts || (() => {})}
                  onDeleteScene={onDeleteSceneCard || (() => {})}
                  onRemoveCharacter={onRemoveCharacterFromSceneCard || (() => {})}
                  onRemoveLocation={onRemoveLocationFromSceneCard || (() => {})}
                  onAddVariation={onAddVariation}
                  onRegenerateAll={onRegenerateAllPrompts_}
                  onRevisePrompt={onRevisePrompt_}
                  onDeletePrompt={onDeletePrompt_}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

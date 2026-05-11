import React, { useCallback, useRef, useState } from 'react';
import { GripVertical, Hash, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SceneCard } from './SceneCard';
import type {
  Character,
  Location,
  SceneCard as SceneCardType,
  SceneReference,
  TimeContext,
} from '@/types';

interface RightPanelProps {
  sceneCards?: SceneCardType[];
  characters?: Character[];
  locations?: Location[];
  timeContexts?: TimeContext[];
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
  onRegenerateAllPrompts_?: (sceneId: string, instruction?: string) => void | Promise<void>;
  onRevisePrompt?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDeletePrompt?: (sceneId: string, promptId: string) => void;
  onRestorePreviousPrompt_?: (sceneId: string, entry: any) => void;
  isBulkGeneratingPrompts?: boolean;
  bulkPromptsProgress?: { done: number; total: number };
  onCancelBulkPrompts?: () => void;
  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
  onGenerateSlotPrompt?: (sceneId: string, slotId: string) => void;
  onReorderSceneCards?: (sceneCards: SceneCardType[]) => void;
  isLoading?: boolean;
}

export function RightPanel({
  sceneCards = [],
  characters = [],
  locations = [],
  timeContexts = [],
  references = [],
  isGeneratingPrompts,
  onGeneratePrompts,
  onGenerateAllPrompts,
  onDeleteSceneCard,
  onUpdateSceneCardNote,
  onRemoveCharacterFromSceneCard,
  onRemoveLocationFromSceneCard,
  onAddCharacterToSceneCard,
  onAddLocationToSceneCard,
  onAddTimeContextToSceneCard,
  onRemoveTimeContextFromSceneCard,
  onAddVariation,
  onRegenerateAllPrompts_,
  onRevisePrompt,
  onDeletePrompt,
  onRestorePreviousPrompt_,
  isBulkGeneratingPrompts,
  bulkPromptsProgress,
  onCancelBulkPrompts,
  onSetPinnedPrompt,
  onGenerateSlotPrompt,
  onReorderSceneCards,
  isLoading,
}: RightPanelProps) {
  const hasSequentialSceneCardNumbers = sceneCards.every((sceneCard, index) => sceneCard.sceneNumber === index + 1);
  const bulkPromptsPercent = bulkPromptsProgress && bulkPromptsProgress.total > 0
    ? Math.round((bulkPromptsProgress.done / bulkPromptsProgress.total) * 100)
    : 0;

  const dragSceneCardIndexRef = useRef<number | null>(null);
  const [dragOverSceneCardIndex, setDragOverSceneCardIndex] = useState<number | null>(null);

  const charMap = React.useMemo(() => new Map(characters.map(c => [c.id, c])), [characters]);
  const locMap = React.useMemo(() => new Map(locations.map(l => [l.id, l])), [locations]);
  const timeMap = React.useMemo(() => new Map(timeContexts.map(tc => [tc.id, tc])), [timeContexts]);

  const handleSceneCardDragStart = useCallback((event: React.DragEvent, index: number) => {
    dragSceneCardIndexRef.current = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleSceneCardDragOver = useCallback((event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverSceneCardIndex(index);
  }, []);

  const handleSceneCardDrop = useCallback((event: React.DragEvent, dropIndex: number) => {
    event.preventDefault();
    const fromIndex = dragSceneCardIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverSceneCardIndex(null);
      dragSceneCardIndexRef.current = null;
      return;
    }

    const reordered = [...sceneCards];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);

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
    onReorderSceneCards(sceneCards.map((sceneCard, index) => ({
      ...sceneCard,
      sceneNumber: index + 1,
    })));
  }, [sceneCards, onReorderSceneCards]);

  return (
    <div className="flex h-full flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Calisma Alani</h2>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Sahneler</span>
            {sceneCards.length > 0 && (
              <Badge variant="secondary" className="h-4 border-none bg-primary/10 px-1.5 text-[9px] font-medium text-primary">
                {sceneCards.length}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {onGenerateAllPrompts && sceneCards.length > 0 ? (
            isBulkGeneratingPrompts ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-2 py-1">
                <div className="flex min-w-[100px] flex-col gap-1">
                  <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                    <span>Uretiliyor...</span>
                    <span>%{bulkPromptsPercent}</span>
                  </div>
                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-background/50">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${bulkPromptsPercent}%` }}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 rounded-full p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={onCancelBulkPrompts}
                >
                  <span className="text-lg leading-none">x</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="group h-8 border-none bg-primary px-3 text-xs shadow-sm shadow-primary/20 hover:bg-primary/90"
                disabled={isGeneratingPrompts}
                onClick={onGenerateAllPrompts}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5 fill-current group-hover:animate-pulse" />
                Toplu Prompt Uret
              </Button>
            )
          ) : null}

          {sceneCards.length > 0 && onReorderSceneCards && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 border-border/60 bg-background/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={handleRenumberSceneCards}
              disabled={hasSequentialSceneCardNumbers}
              title={hasSequentialSceneCardNumbers ? 'Sahne numaralari zaten sirali' : 'Sahne numaralarini yeniden sirala'}
              aria-label="Sahne numaralarini yeniden sirala"
            >
              <Hash className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-4 px-1 py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-3 rounded-xl border bg-card/50 p-4">
                <div className="flex justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-16 w-full animate-pulse rounded bg-muted/40" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 animate-pulse rounded bg-muted/60" />
                  <div className="h-8 w-20 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : sceneCards.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground animate-in slide-in-from-bottom-2 duration-500">
            <div className="relative mb-5">
              <div className="absolute -inset-3 animate-pulse rounded-full bg-primary/20 blur" />
              <div className="relative rounded-2xl border border-border bg-card p-4 shadow-md">
                <Zap className="h-8 w-8 text-primary opacity-80" />
              </div>
            </div>
            <p className="text-base font-medium text-foreground">Henuz sahne eklenmedi</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
              Metni analiz ederek AI sahne kartlarini olusturmaya baslayin.
            </p>
          </div>
        ) : (
          sceneCards.map((sceneCard, index) => {
            const sceneChars = sceneCard.characterIds.map(id => charMap.get(id)).filter(Boolean) as Character[];
            const sceneLocs = sceneCard.locationIds.map(id => locMap.get(id)).filter(Boolean) as Location[];
            const sceneTimeContexts = (sceneCard.timeContextIds ?? []).map(id => timeMap.get(id)).filter(Boolean) as TimeContext[];
            const sceneReferences = references.filter(ref => ref.assignedSceneIds?.includes(sceneCard.id));

            return (
              <div
                key={sceneCard.id}
                draggable
                onDragStart={(event) => handleSceneCardDragStart(event, index)}
                onDragOver={(event) => handleSceneCardDragOver(event, index)}
                onDrop={(event) => handleSceneCardDrop(event, index)}
                onDragEnd={handleSceneCardDragEnd}
                className={`relative transition-all ${dragOverSceneCardIndex === index ? 'border-t-2 border-primary pt-1' : ''}`}
              >
                <div className="flex gap-1">
                  <div className="flex cursor-grab items-start pt-3 text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {sceneCard.promptsNeedRefresh && (
                      <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-600">
                        Agent degisikligi uygulandi. Bu sahnedeki promptlar yeniden uretilmeli.
                      </div>
                    )}
                    <SceneCard
                      scene={sceneCard}
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
          })
        )}
      </div>
    </div>
  );
}

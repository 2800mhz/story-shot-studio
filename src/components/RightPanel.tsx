import React, { useCallback, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SceneCard } from './SceneCard';
import type { SceneCard as SceneCardType, Character, Location, TimeContext } from '@/types';
import type { HistoryEntry } from './PromptHistoryModal';

interface RightPanelProps {
  sceneCards?: SceneCardType[];
  characters?: Character[];
  locations?: Location[];
  timeContexts?: TimeContext[];
  isGeneratingPrompts?: boolean;
  onGeneratePrompts?: (sceneId: string) => void;
  onGenerateAllPrompts?: () => void;
  onDeleteSceneCard?: (sceneId: string) => void;
  onUpdateSceneCardNote?: (sceneId: string, note: string) => void;
  onRemoveCharacterFromSceneCard?: (sceneId: string, characterId: string) => void;
  onRemoveLocationFromSceneCard?: (sceneId: string, locationId: string) => void;
  onAddCharacterToSceneCard?: (sceneId: string, name: string) => void;
  onAddLocationToSceneCard?: (sceneId: string, name: string) => void;
  onAddTimeContextToSceneCard?: (sceneId: string, timeContextId: string) => void;
  onRemoveTimeContextFromSceneCard?: (sceneId: string, timeContextId: string) => void;
  onAddVariation?: (sceneId: string) => void;
  onRegenerateAllPrompts_?: (sceneId: string) => void;
  onRevisePrompt?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDeletePrompt?: (sceneId: string, promptId: string) => void;
  onRestorePreviousPrompt_?: (sceneId: string, entry: HistoryEntry) => void;
  isBulkGeneratingPrompts?: boolean;
  bulkPromptsProgress?: { done: number; total: number };
  onCancelBulkPrompts?: () => void;
  onSetPinnedPrompt?: (sceneId: string, promptId: string) => void;
  isLoading?: boolean;
  onReorderSceneCards?: (sceneCards: SceneCardType[]) => void;
}

export function RightPanel({
  sceneCards = [],
  characters = [],
  locations = [],
  timeContexts = [],
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
  isLoading,
  onReorderSceneCards,
}: RightPanelProps) {
  const bulkPromptsPercent = bulkPromptsProgress && bulkPromptsProgress.total > 0
    ? Math.round((bulkPromptsProgress.done / bulkPromptsProgress.total) * 100)
    : 0;

  const dragSceneCardIndexRef = useRef<number | null>(null);
  const [dragOverSceneCardIndex, setDragOverSceneCardIndex] = useState<number | null>(null);

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
    reordered.forEach((sc, idx) => {
      sc.sceneNumber = idx + 1;
    });

    onReorderSceneCards?.(reordered);
    setDragOverSceneCardIndex(null);
    dragSceneCardIndexRef.current = null;
  }, [onReorderSceneCards, sceneCards]);

  const handleSceneCardDragEnd = useCallback(() => {
    setDragOverSceneCardIndex(null);
    dragSceneCardIndexRef.current = null;
  }, []);

  return (
    <div className="flex h-full flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Çalışma Alanı</h2>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Sahneler</span>
            {sceneCards.length > 0 && (
              <Badge variant="secondary" className="h-4 border-none bg-primary/10 px-1.5 text-[9px] font-medium text-primary">
                {sceneCards.length}
              </Badge>
            )}
          </div>
        </div>

        {onGenerateAllPrompts && sceneCards.length > 0 && (
          isBulkGeneratingPrompts ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-2 py-1">
              <div className="flex min-w-[100px] flex-col gap-1">
                <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                  <span>Üretiliyor...</span>
                  <span>%{bulkPromptsPercent}</span>
                </div>
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-background/50">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${bulkPromptsPercent}%` }}
                  />
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 rounded-full p-0 hover:bg-destructive/10 hover:text-destructive" onClick={onCancelBulkPrompts}>
                <span className="text-lg leading-none">×</span>
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
              Toplu Prompt Üret
            </Button>
          )
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
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
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">Henüz sahne eklenmedi</p>
          </div>
        ) : (
          sceneCards.map((sc, i) => {
            const sceneChars = characters.filter(c => sc.characterIds.includes(c.id));
            const sceneLocs = locations.filter(l => sc.locationIds.includes(l.id));
            const sceneTimeContexts = timeContexts.filter(tc => (sc.timeContextIds ?? []).includes(tc.id));

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
                <SceneCard
                  scene={sc}
                  characters={sceneChars}
                  locations={sceneLocs}
                  timeContexts={sceneTimeContexts}
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
                  isBulkGenerating={isBulkGeneratingPrompts}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

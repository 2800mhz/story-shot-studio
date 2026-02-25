import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import type { Scene, Episode, TextSegment, ConsistencyGroup, SelectionMode } from '@/types';
import { FloatingToolbar } from './FloatingToolbar';
import { X } from 'lucide-react';

const GROUP_COLORS: Record<string, string> = {
  A: 'border-l-blue-500',
  B: 'border-l-teal-500',
  C: 'border-l-rose-500',
  D: 'border-l-orange-500',
};

interface CenterPanelProps {
  mainText: string;
  episodes: Episode[];
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
  activeSceneId: string | null;
  selectionMode: SelectionMode;
  scrollToIndex: number | null;
  onScrollComplete: () => void;
  onAddScene: (segment: TextSegment, episodeTitle: string) => void;
  onAddReference: (segment: TextSegment) => void;
  onAppendToLastScene: (segment: TextSegment) => void;
  onAddConsistency: (segment: TextSegment, groupId: string | null) => void;
  onSetActiveScene: (id: string | null) => void;
  onRemoveScene: (id: string) => void;
  onAnalyzeText?: (text: string) => void;
  isAnalyzing?: boolean;
}

export function CenterPanel({
  mainText, episodes, scenes, consistencyGroups, activeSceneId, selectionMode,
  scrollToIndex, onScrollComplete,
  onAddScene, onAddReference, onAppendToLastScene, onAddConsistency, onSetActiveScene, onRemoveScene,
  onAnalyzeText, isAnalyzing,
}: CenterPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSceneRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{
    position: { top: number; left: number };
    selectedText: string;
    segment: TextSegment | null;
  } | null>(null);

  // Check if scenes are AI-parsed (have text property) or manual (have segments)
  const hasAiScenes = scenes.length > 0 && scenes.some(s => s.text);

  // Scroll to active scene when it changes
  useEffect(() => {
    if (activeSceneId && activeSceneRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const el = activeSceneRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 80;
      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [activeSceneId]);

  // Scroll to episode position when scrollToIndex changes
  useEffect(() => {
    if (scrollToIndex === null || !scrollContainerRef.current) return;

    // In AI scene mode, find the scene containing this index
    if (hasAiScenes) {
      const targetScene = scenes.find(
        s => s.startIndex !== undefined && s.endIndex !== undefined &&
             scrollToIndex >= s.startIndex && scrollToIndex < s.endIndex
      );
      if (targetScene) {
        onSetActiveScene(targetScene.id);
      }
    } else if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const allSpans = container.querySelectorAll<HTMLElement>('[data-char-start]');
      let targetEl: HTMLElement | null = null;

      for (const span of allSpans) {
        const start = parseInt(span.dataset.charStart || '0', 10);
        const end = parseInt(span.dataset.charEnd || '0', 10);
        if (scrollToIndex >= start && scrollToIndex < end) {
          targetEl = span;
          break;
        }
      }

      if (!targetEl) {
        let closestDist = Infinity;
        for (const span of allSpans) {
          const start = parseInt(span.dataset.charStart || '0', 10);
          const dist = Math.abs(start - scrollToIndex);
          if (dist < closestDist) {
            closestDist = dist;
            targetEl = span;
          }
        }
      }

      if (targetEl) {
        const containerRect = container.getBoundingClientRect();
        const elRect = targetEl.getBoundingClientRect();
        const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 60;
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });

        targetEl.style.transition = 'background-color 0.3s';
        targetEl.style.backgroundColor = 'hsl(36 90% 55% / 0.3)';
        setTimeout(() => {
          if (targetEl) targetEl.style.backgroundColor = '';
        }, 1500);
      }
    }

    onScrollComplete();
  }, [scrollToIndex, onScrollComplete, hasAiScenes, scenes, onSetActiveScene]);

  // Handle text selection for floating toolbar
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }
    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Compute segment start/end in fullText
    let startIndex = -1;
    let endIndex = -1;
    if (mainText) {
      startIndex = mainText.indexOf(selectedText);
      if (startIndex !== -1) endIndex = startIndex + selectedText.length;
    }

    const segment: TextSegment | null = startIndex !== -1
      ? { id: `sel-${Date.now()}`, text: selectedText, startIndex, endIndex }
      : null;

    setToolbar({
      position: { top: rect.top + window.scrollY, left: Math.max(8, rect.left + window.scrollX) },
      selectedText,
      segment,
    });
  }, [mainText]);

  const dismissToolbar = useCallback(() => {
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAddSceneFromSelection = useCallback(() => {
    if (!toolbar?.segment) return;
    const ep = episodes.find(e => toolbar.segment!.startIndex >= e.startIndex && toolbar.segment!.startIndex < e.endIndex);
    onAddScene(toolbar.segment, ep?.title || 'Manuel Seçim');
    dismissToolbar();
  }, [toolbar, episodes, onAddScene, dismissToolbar]);

  const handleAddReferenceFromSelection = useCallback(() => {
    if (!toolbar?.segment) return;
    onAddReference(toolbar.segment);
    dismissToolbar();
  }, [toolbar, onAddReference, dismissToolbar]);

  const handleAppendFromSelection = useCallback(() => {
    if (!toolbar?.segment) return;
    onAppendToLastScene(toolbar.segment);
    dismissToolbar();
  }, [toolbar, onAppendToLastScene, dismissToolbar]);

  const handleAddConsistencyFromSelection = useCallback((groupId: string | null) => {
    if (!toolbar?.segment) return;
    onAddConsistency(toolbar.segment, groupId);
    dismissToolbar();
  }, [toolbar, onAddConsistency, dismissToolbar]);

  const handleAnalyzeFromSelection = useCallback(() => {
    if (!toolbar?.selectedText || !onAnalyzeText) return;
    onAnalyzeText(toolbar.selectedText);
    dismissToolbar();
  }, [toolbar, onAnalyzeText, dismissToolbar]);

  // Build highlight ranges for manual scenes
  const highlights = useMemo(() => {
    if (hasAiScenes) return [];
    const h: { start: number; end: number; type: 'scene' | 'reference' | 'done' | 'consistency'; sceneIndex: number; groupLabel?: string }[] = [];
    scenes.forEach((scene, si) => {
      scene.segments.forEach(seg => {
        h.push({
          start: seg.startIndex,
          end: seg.endIndex,
          type: scene.status === 'done' ? 'done' : 'scene',
          sceneIndex: si + 1,
        });
      });
      scene.subjectReferences.forEach(seg => {
        h.push({ start: seg.startIndex, end: seg.endIndex, type: 'reference', sceneIndex: si + 1 });
      });
      if (scene.consistencyGroupIds && scene.consistencyGroupIds.length > 0) {
        scene.consistencyGroupIds.forEach(gId => {
          const group = consistencyGroups.find(g => g.id === gId);
          if (group) {
            scene.segments.forEach(seg => {
              h.push({ start: seg.startIndex, end: seg.endIndex, type: 'consistency', sceneIndex: si + 1, groupLabel: group.label });
            });
          }
        });
      }
    });
    return h.sort((a, b) => a.start - b.start);
  }, [scenes, consistencyGroups, hasAiScenes]);

  const renderHighlightedText = useMemo(() => {
    if (!mainText) return null;
    if (highlights.length === 0) return <span data-char-start="0" data-char-end={mainText.length}>{mainText}</span>;

    const used = new Set<string>();
    const deduped = highlights.filter(h => {
      const key = `${h.start}-${h.end}-${h.type}`;
      if (used.has(key)) return false;
      used.add(key);
      return true;
    });

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    deduped.forEach((h, i) => {
      if (h.start < lastEnd) return;
      if (h.start > lastEnd) {
        parts.push(<span key={`t-${i}`} data-char-start={lastEnd} data-char-end={h.start}>{mainText.slice(lastEnd, h.start)}</span>);
      }
      const cls =
        h.type === 'reference' ? 'text-highlight-reference' :
        h.type === 'done' ? 'text-highlight-done' :
        h.type === 'consistency' ? 'border-l-2 pl-1' :
        'text-highlight-scene';

      const borderClass = h.type === 'consistency' && h.groupLabel
        ? GROUP_COLORS[h.groupLabel] || 'border-l-blue-500'
        : '';

      parts.push(
        <span key={`h-${i}`} className={`${cls} ${borderClass} relative rounded-sm`} data-char-start={h.start} data-char-end={h.end}>
          {h.type === 'reference' && (
            <span className="ml-0.5 inline-flex items-center rounded bg-accent/30 px-1 text-[9px] font-bold uppercase text-accent align-text-top">REF</span>
          )}
          {h.type === 'consistency' && h.groupLabel && (
            <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/30 text-[9px] font-bold text-blue-400 align-text-top">{h.groupLabel}</span>
          )}
          {(h.type === 'scene' || h.type === 'done') && (
            <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground align-text-top">{h.sceneIndex}</span>
          )}
          {mainText.slice(h.start, h.end)}
        </span>
      );
      lastEnd = h.end;
    });

    if (lastEnd < mainText.length) {
      parts.push(<span key="tail" data-char-start={lastEnd} data-char-end={mainText.length}>{mainText.slice(lastEnd)}</span>);
    }
    return parts;
  }, [mainText, highlights]);

  // ─── AI Scene View ────────────────────────────────────────────────
  if (hasAiScenes) {
    if (isAnalyzing) {
      return (
        <div className="flex h-full items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">🤖</div>
            <p className="text-lg font-medium">AI Metin Analiz Ediyor...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Karakterler, mekanlar ve sahneler tespit ediliyor
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col bg-background">
        <div className="border-b p-3 bg-muted/30 shrink-0">
          <div className="text-sm font-medium">📄 Metin Görünümü</div>
          <div className="text-xs text-muted-foreground">{scenes.length} sahne tespit edildi</div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 font-serif leading-relaxed">
            {scenes.map((scene, idx) => (
              <div key={scene.id}>
                <div
                  ref={activeSceneId === scene.id ? activeSceneRef : undefined}
                  className={`whitespace-pre-wrap transition-all cursor-pointer rounded-sm ${
                    activeSceneId === scene.id
                      ? 'bg-primary/10 border-l-4 border-primary pl-3 py-2 -ml-1'
                      : 'hover:bg-muted/30 py-1'
                  }`}
                  onClick={() => {
                    onSetActiveScene(scene.id);
                  }}
                >
                  {scene.text}
                </div>

                {idx < scenes.length - 1 && (
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-primary/40" />
                    <div className="flex items-center gap-2 text-xs font-mono text-primary">
                      <span className="opacity-50">━━━━━━</span>
                      <span className="font-semibold px-2 py-1 bg-primary/10 rounded">
                        Sahne {scene.number}
                      </span>
                      <span className="opacity-50">━━━━━━</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/40 via-primary/40 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Legacy Manual Selection View ────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {isAnalyzing && (
        <div className="border-b bg-primary/10 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="text-sm">
            <span className="font-semibold">AI Analiz Ediliyor...</span>
            <span className="text-xs text-muted-foreground ml-2">
              Sahneler oluşturuluyor
            </span>
          </div>
        </div>
      )}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6" onMouseUp={handleMouseUp}>
        {mainText ? (
          <div
            className="font-serif text-[17px] leading-[1.8] text-foreground/90 selection:bg-primary/30"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {renderHighlightedText}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-center text-sm">Ana metni yüklemek için üst menüdeki "Ana Metin" butonunu kullanın</p>
          </div>
        )}
      </div>

      {/* Floating Toolbar for text selection */}
      {toolbar && (
        <FloatingToolbar
          position={toolbar.position}
          selectionMode={selectionMode}
          consistencyGroups={consistencyGroups}
          onAddScene={handleAddSceneFromSelection}
          onAddReference={handleAddReferenceFromSelection}
          onAddConsistency={handleAddConsistencyFromSelection}
          onAppendToScene={handleAppendFromSelection}
          onDismiss={dismissToolbar}
          hasScenes={scenes.length > 0}
          onAnalyzeWithAI={onAnalyzeText ? handleAnalyzeFromSelection : undefined}
          isAnalyzing={isAnalyzing}
        />
      )}

      {/* Scene Strip */}
      {scenes.length > 0 && (
        <div className="border-t bg-card px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
            {scenes.map((scene, i) => (
              <button
                key={scene.id}
                onClick={() => onSetActiveScene(scene.id)}
                className={`group flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  activeSceneId === scene.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50'
                }`}
              >
                <span className="font-medium">{i + 1}</span>
                <span className="max-w-[100px] truncate text-muted-foreground">
                  {scene.segments[0]?.text.slice(0, 25)}...
                </span>
                <X
                  className="ml-1 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onRemoveScene(scene.id); }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

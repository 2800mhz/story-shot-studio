import React, { useCallback, useRef, useMemo, useEffect } from 'react';
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
}

export function CenterPanel({
  mainText, episodes, scenes, consistencyGroups, activeSceneId, selectionMode,
  scrollToIndex, onScrollComplete,
  onAddScene, onAddReference, onAppendToLastScene, onAddConsistency, onSetActiveScene, onRemoveScene,
}: CenterPanelProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = React.useState<{
    visible: boolean;
    position: { top: number; left: number };
    text: string;
    startIndex: number;
    endIndex: number;
  }>({ visible: false, position: { top: 0, left: 0 }, text: '', startIndex: 0, endIndex: 0 });

  // Scroll to episode position when scrollToIndex changes
  useEffect(() => {
    if (scrollToIndex === null || !textRef.current || !scrollContainerRef.current) return;

    // Find the span element that contains the target character index using data attributes
    const container = textRef.current;
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

    // Fallback: find the closest span after scrollToIndex
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
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop + (elRect.top - containerRect.top) - 60;
      scrollContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });

      // Flash highlight effect
      targetEl.style.transition = 'background-color 0.3s';
      targetEl.style.backgroundColor = 'hsl(36 90% 55% / 0.3)';
      setTimeout(() => {
        if (targetEl) targetEl.style.backgroundColor = '';
      }, 1500);
    }

    onScrollComplete();
  }, [scrollToIndex, onScrollComplete]);

  const getCharOffsetFromNode = useCallback((container: HTMLElement, node: Node, offset: number): number => {
    // Walk through container's child spans that have data-char-start/end attributes
    // to find the actual character index in the original mainText
    const spans = container.querySelectorAll<HTMLElement>('[data-char-start]');
    for (const span of spans) {
      if (span.contains(node)) {
        const charStart = parseInt(span.dataset.charStart || '0', 10);
        // We need to find the text offset within the actual text content of this span,
        // excluding any badge/label elements
        // Walk text nodes within span to calculate offset
        let textOffset = 0;
        const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
        let currentNode = walker.nextNode();
        while (currentNode) {
          if (currentNode === node) {
            return charStart + textOffset + offset;
          }
          // Only count text nodes that are direct content (not inside badge elements)
          const parent = currentNode.parentElement;
          const isBadge = parent && parent !== span && parent.classList.contains('inline-flex');
          if (!isBadge) {
            textOffset += currentNode.textContent?.length || 0;
          }
          currentNode = walker.nextNode();
        }
        // Fallback: just use charStart + offset
        return charStart + offset;
      }
    }
    return 0;
  }, []);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const text = selection.toString().trim();
    if (text.length < 5) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = textRef.current;
    if (!container) return;

    const startIndex = getCharOffsetFromNode(container, range.startContainer, range.startOffset);
    const endIndex = getCharOffsetFromNode(container, range.endContainer, range.endOffset);

    setToolbar({
      visible: true,
      position: { top: rect.top + window.scrollY, left: rect.left + (rect.width / 2) - 140 },
      text,
      startIndex,
      endIndex,
    });
  }, [getCharOffsetFromNode]);

  const dismissToolbar = useCallback(() => {
    setToolbar(prev => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  }, []);

  const makeSegment = useCallback((): TextSegment => ({
    id: `seg-${Date.now()}`,
    text: toolbar.text,
    startIndex: toolbar.startIndex,
    endIndex: toolbar.endIndex,
  }), [toolbar]);

  const getCurrentEpisodeTitle = useCallback(() => {
    const idx = toolbar.startIndex;
    for (const ep of [...episodes].reverse()) {
      if (idx >= ep.startIndex) return ep.title;
    }
    return episodes[0]?.title || 'Belge';
  }, [episodes, toolbar.startIndex]);

  const handleAddScene = useCallback(() => {
    onAddScene(makeSegment(), getCurrentEpisodeTitle());
    dismissToolbar();
  }, [makeSegment, onAddScene, getCurrentEpisodeTitle, dismissToolbar]);

  const handleAddReference = useCallback(() => {
    onAddReference(makeSegment());
    dismissToolbar();
  }, [makeSegment, onAddReference, dismissToolbar]);

  const handleAppend = useCallback(() => {
    onAppendToLastScene(makeSegment());
    dismissToolbar();
  }, [makeSegment, onAppendToLastScene, dismissToolbar]);

  const handleAddConsistency = useCallback((groupId: string | null) => {
    onAddConsistency(makeSegment(), groupId);
    dismissToolbar();
  }, [makeSegment, onAddConsistency, dismissToolbar]);

  // Build highlight ranges
  const highlights = useMemo(() => {
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
  }, [scenes, consistencyGroups]);

  const renderHighlightedText = useMemo(() => {
    if (!mainText) return null;
    if (highlights.length === 0) return <span data-char-start="0" data-char-end={mainText.length}>{mainText}</span>;

    // Deduplicate overlapping ranges — keep first occurrence
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
      if (h.start < lastEnd) return; // skip overlapping
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

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6" onMouseUp={handleMouseUp} onContextMenu={e => { if (window.getSelection()?.toString().trim()) e.preventDefault(); }}>
        {mainText ? (
          <div
            ref={textRef}
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

      {toolbar.visible && (
        <FloatingToolbar
          position={toolbar.position}
          selectionMode={selectionMode}
          consistencyGroups={consistencyGroups}
          onAddScene={handleAddScene}
          onAddReference={handleAddReference}
          onAddConsistency={handleAddConsistency}
          onAppendToScene={handleAppend}
          onDismiss={dismissToolbar}
          hasScenes={scenes.length > 0}
        />
      )}
    </div>
  );
}

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FloatingToolbar } from './FloatingToolbar';

interface SceneSlim {
  id: string;
  number: number;
  text?: string;
  startIndex?: number;
  endIndex?: number;
}

interface CenterPanelProps {
  mainText: string;
  scenes: SceneSlim[];
  activeSceneId: string | null;
  scrollToIndex: number | null;
  onScrollComplete: () => void;
  onSetActiveScene: (id: string | null) => void;
  onAnalyzeText?: (text: string, targetSceneCount?: number, sourceStartIndex?: number) => void;
  isAnalyzing?: boolean;
  isLoading?: boolean;
  analysisLog?: string[];
}

type RichTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  mark?: boolean;
};

function fallbackPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function mergeRuns(runs: RichTextRun[]): RichTextRun[] {
  const merged: RichTextRun[] = [];

  for (const run of runs) {
    if (!run.text) continue;
    const previous = merged[merged.length - 1];
    const sameStyle = previous
      && previous.bold === run.bold
      && previous.italic === run.italic
      && previous.underline === run.underline
      && previous.strike === run.strike
      && previous.mark === run.mark;

    if (sameStyle) {
      previous.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }

  return merged;
}

function parseRichText(value: string): { plainText: string; runs: RichTextRun[] } {
  if (!value) return { plainText: '', runs: [] };

  if (typeof DOMParser === 'undefined') {
    const plainText = fallbackPlainText(value);
    return { plainText, runs: [{ text: plainText }] };
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${value}</div>`, 'text/html');
  const root = document.body.firstElementChild;
  const runs: RichTextRun[] = [];

  const visit = (node: Node, style: Omit<RichTextRun, 'text'>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      runs.push({ ...style, text: node.textContent ?? '' });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'br') {
      runs.push({ ...style, text: '\n' });
      return;
    }

    const nextStyle = { ...style };
    if (tag === 'strong' || tag === 'b') nextStyle.bold = true;
    if (tag === 'em' || tag === 'i') nextStyle.italic = true;
    if (tag === 'u') nextStyle.underline = true;
    if (tag === 'del' || tag === 's' || tag === 'strike') nextStyle.strike = true;
    if (tag === 'mark') nextStyle.mark = true;

    element.childNodes.forEach(child => visit(child, nextStyle));
  };

  if (root) {
    root.childNodes.forEach(child => visit(child, {}));
  }

  const merged = mergeRuns(runs);
  return {
    plainText: merged.map(run => run.text).join(''),
    runs: merged,
  };
}

function getRunClassName(run: RichTextRun): string {
  const classes: string[] = [];
  if (run.bold) classes.push('font-bold text-foreground');
  if (run.italic) classes.push('italic');
  if (run.underline) classes.push('underline decoration-amber-400/80 underline-offset-4');
  if (run.strike) classes.push('line-through decoration-destructive/70');
  if (run.mark) classes.push('rounded-sm bg-yellow-300 px-0.5 text-yellow-950 box-decoration-clone');
  return classes.join(' ');
}

function getRangeStartOffset(root: HTMLElement, range: Range): number | undefined {
  if (!root.contains(range.startContainer)) return undefined;

  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent?.closest('[data-offset-ignore="true"]')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    if (node === range.startContainer) {
      return offset + range.startOffset;
    }
    offset += node.textContent?.length ?? 0;
    node = walker.nextNode();
  }

  return undefined;
}

export function CenterPanel({
  mainText, scenes, activeSceneId,
  scrollToIndex, onScrollComplete,
  onSetActiveScene,
  onAnalyzeText, isAnalyzing, isLoading, analysisLog,
}: CenterPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSceneRef = useRef<HTMLElement>(null);
  const episodeScrollAnchorRef = useRef<HTMLSpanElement>(null);
  const [episodeScrollIndex, setEpisodeScrollIndex] = useState<number | null>(null);
  const [toolbar, setToolbar] = useState<{
    position: { top: number; left: number };
    selectedText: string;
    selectionCount?: number;
    sourceStartIndex?: number;
  } | null>(null);
  
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const richText = React.useMemo(() => parseRichText(mainText), [mainText]);
  const plainText = richText.plainText;

  // Check if scenes are AI-parsed (have text property)
  const hasAiScenes = scenes.length > 0 && scenes.some(s => s.text);

  // Scroll to active scene when it changes
  useEffect(() => {
    if (episodeScrollIndex !== null) return;

    if (activeSceneId && activeSceneRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const el = activeSceneRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 80;
      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [activeSceneId, episodeScrollIndex]);

  // Scroll to episode position when scrollToIndex changes
  useEffect(() => {
    if (scrollToIndex === null || !scrollContainerRef.current) return;

    const clampedIndex = Math.max(0, Math.min(scrollToIndex, plainText.length));
    setEpisodeScrollIndex(clampedIndex);

    // In AI scene mode, find the scene containing this index
    if (hasAiScenes) {
      const targetScene = scenes.find(
        s => s.startIndex !== undefined && s.endIndex !== undefined &&
          scrollToIndex >= s.startIndex && scrollToIndex < s.endIndex
      );
      if (targetScene) {
        onSetActiveScene(targetScene.id);
      }
    }

    onScrollComplete();
  }, [scrollToIndex, plainText.length, onScrollComplete, hasAiScenes, scenes, onSetActiveScene]);

  useEffect(() => {
    if (episodeScrollIndex === null) return;

    let innerScrollFrame: number | null = null;
    const scrollFrame = window.requestAnimationFrame(() => {
      innerScrollFrame = window.requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        const target = episodeScrollAnchorRef.current || activeSceneRef.current;
        if (!container || !target) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const headerOffset = Math.min(140, Math.max(72, container.clientHeight * 0.18));
        const nextTop = container.scrollTop + (targetRect.top - containerRect.top) - headerOffset;
        container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
      });
    });

    const highlightTimer = window.setTimeout(() => {
      setEpisodeScrollIndex(null);
    }, 1700);

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      if (innerScrollFrame !== null) window.cancelAnimationFrame(innerScrollFrame);
      window.clearTimeout(highlightTimer);
    };
  }, [episodeScrollIndex]);

  const renderEpisodeScrollAnchor = useCallback((key: string) => (
    <span
      key={key}
      ref={episodeScrollAnchorRef}
      aria-hidden="true"
      className="relative inline-block h-0 w-0 scroll-mt-24 align-baseline"
    >
      <span className="pointer-events-none absolute -left-2 -top-3 h-8 w-1 rounded-full bg-primary/90 shadow-lg shadow-primary/30 animate-pulse" />
    </span>
  ), []);

  const renderTextRange = useCallback((start: number, end: number, keyPrefix: string): React.ReactNode[] => {
    const safeStart = Math.max(0, Math.min(start, plainText.length));
    const safeEnd = Math.max(safeStart, Math.min(end, plainText.length));
    if (safeEnd <= safeStart) return [];

    const shouldPlaceAnchor =
      episodeScrollIndex !== null &&
      episodeScrollIndex >= safeStart &&
      (episodeScrollIndex < safeEnd || (episodeScrollIndex === plainText.length && safeEnd === plainText.length));

    const renderPlainRange = (from: number, to: number, keySuffix: string): React.ReactNode[] => {
      const nodes: React.ReactNode[] = [];
      let cursor = 0;

      richText.runs.forEach((run, runIndex) => {
        const runStart = cursor;
        const runEnd = cursor + run.text.length;
        cursor = runEnd;

        const sliceStart = Math.max(from, runStart);
        const sliceEnd = Math.min(to, runEnd);
        if (sliceEnd <= sliceStart) return;

        nodes.push(
          <span
            key={`${keyPrefix}-${keySuffix}-${runIndex}-${sliceStart}`}
            className={getRunClassName(run)}
          >
            {run.text.slice(sliceStart - runStart, sliceEnd - runStart)}
          </span>,
        );
      });

      return nodes;
    };

    if (!shouldPlaceAnchor) {
      return renderPlainRange(safeStart, safeEnd, 'text');
    }

    const nodes: React.ReactNode[] = [];

    if (episodeScrollIndex > safeStart) {
      nodes.push(...renderPlainRange(safeStart, episodeScrollIndex, 'before'));
    }

    nodes.push(renderEpisodeScrollAnchor(`${keyPrefix}-anchor`));

    if (episodeScrollIndex < safeEnd) {
      nodes.push(...renderPlainRange(episodeScrollIndex, safeEnd, 'after'));
    }

    return nodes;
  }, [episodeScrollIndex, plainText.length, renderEpisodeScrollAnchor, richText.runs]);

  // Handle text selection for floating toolbar
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    const rawSelectedText = selection?.toString() ?? '';
    const selectedText = rawSelectedText.trim();

    if (!selection || selection.isCollapsed || !selectedText) {
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const leadingTrimLength = rawSelectedText.length - rawSelectedText.trimStart().length;
    const selectionStart = scrollContainerRef.current
      ? getRangeStartOffset(scrollContainerRef.current, range)
      : undefined;

    let currentSelectionList = [...multiSelection];
    let sourceStartIndex: number | undefined;

    // If Ctrl or Meta (Cmd) key is pressed, append to existing selection
    if (e.ctrlKey || e.metaKey) {
      if (!currentSelectionList.includes(selectedText)) {
        currentSelectionList.push(selectedText);
      }
    } else {
      // Otherwise, start a fresh selection
      currentSelectionList = [selectedText];
      sourceStartIndex = selectionStart !== undefined ? selectionStart + leadingTrimLength : undefined;
    }
    
    setMultiSelection(currentSelectionList);

    setToolbar({
      position: { top: rect.top + window.scrollY, left: Math.max(8, rect.left + window.scrollX) },
      selectedText: currentSelectionList.join('\n\n'),
      selectionCount: currentSelectionList.length,
      sourceStartIndex,
    });
  }, [multiSelection]);

  const dismissToolbar = useCallback(() => {
    setToolbar(null);
    setMultiSelection([]);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAnalyzeFromSelection = useCallback((targetSceneCount?: number) => {
    if (!toolbar?.selectedText || !onAnalyzeText) return;
    onAnalyzeText(toolbar.selectedText, targetSceneCount, toolbar.sourceStartIndex);
    dismissToolbar();
  }, [toolbar, onAnalyzeText, dismissToolbar]);

  const renderSelectionToolbar = () => (
    toolbar && onAnalyzeText ? (
      <FloatingToolbar
        position={toolbar.position}
        onAnalyzeWithAI={handleAnalyzeFromSelection}
        onDismiss={dismissToolbar}
        isAnalyzing={isAnalyzing}
        selectionCount={toolbar.selectionCount}
      />
    ) : null
  );

  // ─── AI Scene View ────────────────────────────────────────────────
  if (hasAiScenes || isAnalyzing || isLoading) {
    if (isAnalyzing || (isLoading && !hasAiScenes)) {
      return (
        <div className="flex h-full flex-col bg-background p-8 overflow-hidden">
          <div className="max-w-2xl w-full mx-auto space-y-8 animate-pulse">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center shadow-sm border border-primary/20">
                <span className={`${isAnalyzing ? 'animate-spin' : ''} text-2xl`}>{isAnalyzing ? '🤖' : '⏳'}</span>
              </div>
              <div>
                <div className="h-6 w-48 bg-muted rounded mb-2"></div>
                <div className="h-3 w-64 bg-muted/60 rounded"></div>
              </div>
            </div>
            
            {/* Skeleton blocks simulating scenes */}
            <div className="space-y-8 opacity-70">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-3">
                  <div className="h-4 w-3/4 bg-muted/40 rounded"></div>
                  <div className="h-4 w-full bg-muted/40 rounded"></div>
                  <div className="h-4 w-5/6 bg-muted/40 rounded"></div>
                </div>
              ))}
            </div>
            
            {/* Live progress log positioned at the bottom */}
            {analysisLog && analysisLog.length > 0 && (
              <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1.5 max-h-40 overflow-y-auto w-full shadow-inner">
                {analysisLog.slice(-5).map((log, i, arr) => (
                  <div key={i} className={`text-xs font-mono transition-opacity ${
                    i === arr.length - 1 ? 'text-primary opacity-100 font-medium' : 'text-muted-foreground opacity-50'
                  }`}>
                    {log}
                  </div>
                ))}
              </div>
            )}
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

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin" onMouseUp={onAnalyzeText ? handleMouseUp : undefined}>
          <div className="p-8 font-serif text-[17px] leading-[2.2] text-foreground/90 whitespace-pre-wrap selection:bg-primary/30">
            {/* If we don't have mainText or scenes lack indices, fallback to legacy block render */}
            {!mainText || !scenes.some(s => s.startIndex !== undefined) ? (
              scenes.map((scene, idx) => (
                <div key={scene.id}>
                  <div
                    ref={activeSceneId === scene.id ? activeSceneRef : undefined}
                    className={`whitespace-pre-wrap transition-all duration-200 cursor-pointer rounded-md py-3 px-4 my-1 ${activeSceneId === scene.id
                        ? 'bg-yellow-200/70 dark:bg-yellow-500/30 border-l-4 border-yellow-500 font-medium shadow-sm'
                        : 'hover:bg-muted/40 hover:border-l-2 hover:border-muted-foreground/30'
                      }`}
                    onClick={() => onSetActiveScene(scene.id)}
                  >
                    <div>{scene.text || ''}</div>
                  </div>
                  {idx < scenes.length - 1 && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-primary/30" />
                      <div className="flex items-center gap-2 text-xs font-mono text-primary/80 bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
                        <span className="opacity-50">━━━</span>
                        <span className="font-semibold">Sahne {scene.number}</span>
                        <span className="opacity-50">━━━</span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-primary/30 to-transparent" />
                    </div>
                  )}
                </div>
              ))
            ) : (() => {
              // INLINE HIGHLIGHT RENDERING
              const elements: React.ReactNode[] = [];
              let currentIndex = 0;

              // Sort scenes by startIndex to process sequentially
              const sortedScenes = [...scenes]
                .filter(s => s.startIndex !== undefined && s.endIndex !== undefined)
                .sort((a, b) => a.startIndex! - b.startIndex!);

              sortedScenes.forEach((scene) => {
                const start = scene.startIndex!;
                const end = scene.endIndex!;

                // Add unhighlighted text before the scene
                if (start > currentIndex) {
                  elements.push(...renderTextRange(currentIndex, start, `text-${currentIndex}`));
                }

                // Add the highlighted scene text
                const isSelected = activeSceneId === scene.id;
                elements.push(
                  <span
                    key={`scene-${scene.id}`}
                    ref={isSelected ? (el) => {
                      // Note: We use HTMLElement ref above to match the span element.
                      if (activeSceneRef) activeSceneRef.current = el;
                    } : undefined}
                    onClick={() => onSetActiveScene(scene.id)}
                    className={`relative cursor-pointer transition-colors duration-200 rounded px-1 -mx-1 ${isSelected
                        ? 'bg-amber-600/30 text-amber-200 outline outline-1 outline-amber-500/50 shadow-sm z-10'
                        : 'hover:bg-amber-900/30 text-amber-100/90'
                      }`}
                  >
                    <span
                      data-offset-ignore="true"
                      aria-hidden="true"
                      className={`inline-flex items-center justify-center rounded-full text-[10px] w-5 h-5 mr-1.5 -ml-1 align-middle select-none transition-colors ${isSelected ? 'bg-amber-500 text-amber-950 font-bold shadow-sm shadow-amber-900/50' : 'bg-amber-800/80 text-amber-100 border border-amber-600/50'
                    }`}>
                      {scene.number}
                    </span>
                    {renderTextRange(start, end, `scene-text-${scene.id}`)}
                  </span>
                );

                currentIndex = end;
              });

              // Add remaining text after the last scene
              if (currentIndex < plainText.length) {
                elements.push(...renderTextRange(currentIndex, plainText.length, `text-${currentIndex}`));
              }

              return elements;
            })()}
          </div>
        </div>
        {renderSelectionToolbar()}
      </div>
    );
  }

  // ─── Legacy view (no AI scenes yet) ─────────────────────────────
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6" onMouseUp={onAnalyzeText ? handleMouseUp : undefined}>
        {mainText ? (
          <div
            className="font-serif text-[17px] leading-[1.8] text-foreground/90 selection:bg-primary/30"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {renderTextRange(0, plainText.length, 'legacy-main')}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl animate-pulse"></div>
              <div className="h-20 w-20 mb-2 rounded-2xl bg-secondary flex items-center justify-center border border-border shadow-sm transform hover:scale-105 hover:rotate-3 transition-all cursor-default">
                <span className="text-4xl">🎬</span>
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-base font-medium text-foreground">Hazır olduğunuzda başlayalım</p>
              <p className="text-sm text-muted-foreground/80 max-w-[260px] leading-relaxed">
                Ana metni yüklemek için üst menüdeki <strong>"Ana Metin"</strong> butonunu kullanın.
              </p>
            </div>
          </div>
        )}
      </div>

      {renderSelectionToolbar()}
    </div>
  );
}

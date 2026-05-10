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

const SCENE_HIGHLIGHT_TONES = [
  { bg: '#F59E0B24', activeBg: '#F59E0B42', border: '#F59E0B88', text: '#FDECC8', badgeBg: '#92400EAA', badgeBorder: '#F59E0B66', badgeText: '#FFE8A3' },
  { bg: '#EAB30822', activeBg: '#EAB30840', border: '#EAB30882', text: '#FBF0C4', badgeBg: '#854D0EAA', badgeBorder: '#EAB30866', badgeText: '#FEF3B4' },
  { bg: '#D9770624', activeBg: '#D9770642', border: '#D9770688', text: '#FFE3C2', badgeBg: '#7C2D12AA', badgeBorder: '#D9770666', badgeText: '#FFD7A3' },
  { bg: '#CA8A0422', activeBg: '#CA8A0440', border: '#CA8A0482', text: '#F5E8B9', badgeBg: '#713F12AA', badgeBorder: '#CA8A0466', badgeText: '#FCE79E' },
  { bg: '#B4530924', activeBg: '#B4530942', border: '#B4530988', text: '#FBD9BA', badgeBg: '#7C2D12AA', badgeBorder: '#B4530966', badgeText: '#FFD2A1' },
  { bg: '#A1620722', activeBg: '#A1620740', border: '#A1620782', text: '#EFE5C0', badgeBg: '#713F12AA', badgeBorder: '#A1620766', badgeText: '#F5E6A8' },
];

function getSceneHighlightTone(sceneNumber: number) {
  const index = Math.abs(Math.round(sceneNumber || 1) - 1) % SCENE_HIGHLIGHT_TONES.length;
  return SCENE_HIGHLIGHT_TONES[index];
}

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
  if (run.mark) classes.push('rounded-sm bg-yellow-400/20 px-0.5 text-foreground ring-1 ring-yellow-300/15 box-decoration-clone');
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

  const handleTextClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-scene-highlight="true"]')) return;

    onSetActiveScene(null);
  }, [onSetActiveScene]);

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
        <div className="hidden">
          <div className="text-sm font-medium">📄 Metin Görünümü</div>
          <div className="text-xs text-muted-foreground">{scenes.length} sahne tespit edildi</div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin"
          onMouseUp={onAnalyzeText ? handleMouseUp : undefined}
          onClick={handleTextClick}
        >
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
                    data-scene-highlight="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetActiveScene(scene.id);
                    }}
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
                const tone = getSceneHighlightTone(scene.number);
                elements.push(
                  <span
                    key={`scene-${scene.id}`}
                    ref={isSelected ? (el) => {
                      // Note: We use HTMLElement ref above to match the span element.
                      if (activeSceneRef) activeSceneRef.current = el;
                    } : undefined}
                    data-scene-highlight="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetActiveScene(scene.id);
                    }}
                    className={`relative cursor-pointer rounded-sm px-[0.18em] mx-[0.06em] box-decoration-clone transition-all duration-200 hover:brightness-110 ${isSelected ? 'z-10' : ''}`}
                    style={{
                      backgroundColor: isSelected ? tone.activeBg : tone.bg,
                      color: tone.text,
                      boxShadow: isSelected ? `0 0 0 1px ${tone.border}, 0 8px 18px ${tone.bg}` : undefined,
                    }}
                  >
                    <span
                      data-offset-ignore="true"
                      aria-hidden="true"
                      className={`inline-flex items-center justify-center rounded-full border text-[10px] w-5 h-5 mx-1 align-middle select-none transition-colors ${isSelected ? 'font-bold shadow-sm' : 'font-semibold'}`}
                      style={{
                        backgroundColor: isSelected ? tone.border : tone.badgeBg,
                        borderColor: tone.badgeBorder,
                        color: isSelected ? '#211400' : tone.badgeText,
                      }}
                    >
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6"
        onMouseUp={onAnalyzeText ? handleMouseUp : undefined}
        onClick={handleTextClick}
      >
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

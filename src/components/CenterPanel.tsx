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
  onRemoveScene: (id: string) => void;
  onAnalyzeText?: (text: string, targetSceneCount?: number) => void;
  isAnalyzing?: boolean;
  analysisLog?: string[];
}

export function CenterPanel({
  mainText, scenes, activeSceneId,
  scrollToIndex, onScrollComplete,
  onSetActiveScene, onRemoveScene,
  onAnalyzeText, isAnalyzing, analysisLog,
}: CenterPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSceneRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{
    position: { top: number; left: number };
    selectedText: string;
    selectionCount?: number;
  } | null>(null);
  
  const [multiSelection, setMultiSelection] = useState<string[]>([]);

  // Check if scenes are AI-parsed (have text property)
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
    }

    onScrollComplete();
  }, [scrollToIndex, onScrollComplete, hasAiScenes, scenes, onSetActiveScene]);

  // Handle text selection for floating toolbar
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }
    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let currentSelectionList = [...multiSelection];

    // If Ctrl or Meta (Cmd) key is pressed, append to existing selection
    if (e.ctrlKey || e.metaKey) {
      if (!currentSelectionList.includes(selectedText)) {
        currentSelectionList.push(selectedText);
      }
    } else {
      // Otherwise, start a fresh selection
      currentSelectionList = [selectedText];
    }
    
    setMultiSelection(currentSelectionList);

    setToolbar({
      position: { top: rect.top + window.scrollY, left: Math.max(8, rect.left + window.scrollX) },
      selectedText: currentSelectionList.join('\n\n'),
      selectionCount: currentSelectionList.length
    });
  }, [multiSelection]);

  const dismissToolbar = useCallback(() => {
    setToolbar(null);
    setMultiSelection([]);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAnalyzeFromSelection = useCallback((targetSceneCount?: number) => {
    if (!toolbar?.selectedText || !onAnalyzeText) return;
    onAnalyzeText(toolbar.selectedText, targetSceneCount);
    dismissToolbar();
  }, [toolbar, onAnalyzeText, dismissToolbar]);

  // ─── AI Scene View ────────────────────────────────────────────────
  if (hasAiScenes) {
    if (isAnalyzing) {
      return (
        <div className="flex h-full flex-col bg-background p-8 overflow-hidden">
          <div className="max-w-2xl w-full mx-auto space-y-8 animate-pulse">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center shadow-sm border border-primary/20">
                <span className="animate-spin text-2xl">🤖</span>
              </div>
              <div>
                <div className="h-6 w-48 bg-muted rounded mb-2"></div>
                <div className="h-3 w-64 bg-muted/60 rounded"></div>
              </div>
            </div>
            
            {/* Skeleton blocks simulating scenes */}
            <div className="space-y-8 opacity-70">
              {[1, 2, 3].map(i => (
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

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-8 font-serif text-[17px] leading-[2.2] text-foreground/90 whitespace-pre-wrap">
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
                    <div dangerouslySetInnerHTML={{ __html: scene.text || '' }} />
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
                  elements.push(
                    <span 
                      key={`text-${currentIndex}`}
                      dangerouslySetInnerHTML={{ __html: mainText.substring(currentIndex, start) }}
                    />
                  );
                }

                // Add the highlighted scene text
                const isSelected = activeSceneId === scene.id;
                elements.push(
                  <span
                    key={`scene-${scene.id}`}
                    ref={isSelected ? (el) => {
                      // Note: We cast to any because we use HTMLDivElement ref above, but this is a span.
                      // The scrolling logic just calls getBoundingClientRect, which exists on Element.
                      if (activeSceneRef) (activeSceneRef as any).current = el;
                    } : undefined}
                    onClick={() => onSetActiveScene(scene.id)}
                    className={`relative cursor-pointer transition-colors duration-200 rounded px-1 -mx-1 ${isSelected
                        ? 'bg-amber-600/30 text-amber-200 outline outline-1 outline-amber-500/50 shadow-sm z-10'
                        : 'hover:bg-amber-900/30 text-amber-100/90'
                      }`}
                  >
                    <span className={`inline-flex items-center justify-center rounded-full text-[10px] w-5 h-5 mr-1.5 -ml-1 align-middle select-none transition-colors ${isSelected ? 'bg-amber-500 text-amber-950 font-bold shadow-sm shadow-amber-900/50' : 'bg-amber-800/80 text-amber-100 border border-amber-600/50'
                      }`}>
                      {scene.number}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: mainText.substring(start, end) }} />
                  </span>
                );

                currentIndex = end;
              });

              // Add remaining text after the last scene
              if (currentIndex < mainText.length) {
                elements.push(
                  <span 
                    key={`text-${currentIndex}`}
                    dangerouslySetInnerHTML={{ __html: mainText.substring(currentIndex) }}
                  />
                );
              }

              return elements;
            })()}
          </div>
        </div>
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
            dangerouslySetInnerHTML={{ __html: mainText }}
          />
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

      {/* Floating Toolbar for text selection - AI only */}
      {toolbar && onAnalyzeText && (
        <FloatingToolbar
          position={toolbar.position}
          onAnalyzeWithAI={handleAnalyzeFromSelection}
          onDismiss={dismissToolbar}
          isAnalyzing={isAnalyzing}
          selectionCount={toolbar.selectionCount}
        />
      )}
    </div>
  );
}

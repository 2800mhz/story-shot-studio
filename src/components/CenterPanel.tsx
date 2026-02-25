import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Scene } from '@/types';
import { FloatingToolbar } from './FloatingToolbar';

interface CenterPanelProps {
  mainText: string;
  scenes: Scene[];
  activeSceneId: string | null;
  scrollToIndex: number | null;
  onScrollComplete: () => void;
  onSetActiveScene: (id: string | null) => void;
  onRemoveScene: (id: string) => void;
  onAnalyzeText?: (text: string) => void;
  isAnalyzing?: boolean;
}

export function CenterPanel({
  mainText, scenes, activeSceneId,
  scrollToIndex, onScrollComplete,
  onSetActiveScene, onRemoveScene,
  onAnalyzeText, isAnalyzing,
}: CenterPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSceneRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{
    position: { top: number; left: number };
    selectedText: string;
  } | null>(null);

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
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }
    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setToolbar({
      position: { top: rect.top + window.scrollY, left: Math.max(8, rect.left + window.scrollX) },
      selectedText,
    });
  }, []);

  const dismissToolbar = useCallback(() => {
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAnalyzeFromSelection = useCallback(() => {
    if (!toolbar?.selectedText || !onAnalyzeText) return;
    onAnalyzeText(toolbar.selectedText);
    dismissToolbar();
  }, [toolbar, onAnalyzeText, dismissToolbar]);

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
                  className={`whitespace-pre-wrap transition-all duration-200 cursor-pointer rounded-md py-3 px-4 my-1 ${
                    activeSceneId === scene.id
                      ? 'bg-yellow-200/70 dark:bg-yellow-500/30 border-l-4 border-yellow-500 font-medium shadow-sm'
                      : 'hover:bg-muted/40 hover:border-l-2 hover:border-muted-foreground/30'
                  }`}
                  onClick={() => {
                    onSetActiveScene(scene.id);
                  }}
                >
                  {scene.text}
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
            ))}
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
          >
            {mainText}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-center text-sm">Ana metni yüklemek için üst menüdeki "Ana Metin" butonunu kullanın</p>
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
        />
      )}
    </div>
  );
}

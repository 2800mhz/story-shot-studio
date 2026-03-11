import React from 'react';
import { Button } from '@/components/ui/button';

interface EpisodeStylePanelProps {
  episodePrompt: string;
  episodePromptTr: string;
  onSetEpisodePrompt: (prompt: string) => void;
  onSetEpisodePromptTr: (prompt: string) => void;
  onClose: () => void;
}

export function EpisodeStylePanel({
  episodePrompt,
  episodePromptTr,
  onSetEpisodePrompt,
  onSetEpisodePromptTr,
  onClose
}: EpisodeStylePanelProps) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">🎨 Bölüm Stili</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={onClose}>✕</Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="flex flex-col flex-1 min-h-0">
           <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
            Türkçe Açıklama (AI Özeti)
          </label>
          <p className="text-[10px] text-muted-foreground/80 mb-2 leading-tight">
            Yapay zekanın İngilizce stili nasıl anladığına dair özet. Değiştirilemez.
          </p>
          <textarea
            className="w-full flex-1 text-xs resize-none rounded-md border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none scrollbar-thin cursor-default"
            placeholder="Görsel stilin Türkçe açıklaması burada görünecek..."
            value={episodePromptTr || ''}
            readOnly
          />
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
            Bölüm Stili (Episode Prompt)
          </label>
          <p className="text-[10px] text-muted-foreground/80 mb-2 leading-tight">
            Tüm sahneler üretilirken ana vizyon ve atmosfer olarak bu kutudaki kurallar öncelikli baz alınır.
          </p>
          <textarea
            className="w-full flex-1 text-xs resize-none rounded-md border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary scrollbar-thin"
            placeholder="Örn: Kabus atmosferi, karanlık ve sisli, 35mm film grain..."
            value={episodePrompt || ''}
            onChange={(e) => onSetEpisodePrompt(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

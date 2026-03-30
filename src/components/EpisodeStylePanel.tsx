import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

interface EpisodeStylePanelProps {
  episodePrompt: string;
  episodePromptTr: string;
  onSetEpisodePrompt: (prompt: string) => void;
  onSetEpisodePromptTr: (prompt: string) => void;
  onReviseEpisodePrompt: (instruction: string) => Promise<void>;
  isRevising?: boolean;
  onClose: () => void;
}

export function EpisodeStylePanel({
  episodePrompt,
  episodePromptTr,
  onSetEpisodePrompt,
  onSetEpisodePromptTr,
  onReviseEpisodePrompt,
  isRevising = false,
  onClose
}: EpisodeStylePanelProps) {
  const [revisionInstruction, setRevisionInstruction] = useState('');

  const handleApply = async () => {
    const instruction = revisionInstruction.trim();
    if (!instruction) return;
    await onReviseEpisodePrompt(instruction);
    setRevisionInstruction('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">🎨 Bölüm Stili</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={onClose}>✕</Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Türkçe özet — salt okunur */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/80 mb-1 block">
            Türkçe Açıklama (AI Özeti)
          </label>
          <p className="text-[10px] text-amber-500/60 mb-2 leading-tight">
            Yapay zekanın İngilizce stili nasıl anladığına dair özet. Değiştirilemez.
          </p>
          <textarea
            className="w-full text-xs min-h-[80px] h-[100px] resize-none rounded-md border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-amber-100 placeholder:text-amber-700/50 focus:outline-none scrollbar-thin cursor-default"
            placeholder="Görsel stilin Türkçe açıklaması burada görünecek..."
            value={episodePromptTr || ''}
            readOnly
          />
        </div>

        {/* İngilizce episode prompt — düzenlenebilir */}
        <div className="flex flex-col flex-1 min-h-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
            Bölüm Stili (Episode Prompt)
          </label>
          <p className="text-[10px] text-muted-foreground/80 mb-2 leading-tight">
            Tüm sahneler üretilirken ana vizyon ve atmosfer olarak bu kutudaki kurallar öncelikli baz alınır.
          </p>
          <textarea
            className="w-full flex-1 text-xs resize-none rounded-md border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary scrollbar-thin min-h-[120px]"
            placeholder="Örn: Kabus atmosferi, karanlık ve sisli, 35mm film grain..."
            value={episodePrompt || ''}
            onChange={(e) => onSetEpisodePrompt(e.target.value)}
          />
        </div>

        {/* Revizyon bölümü */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3 h-3 text-primary/70" />
            <label className="text-xs font-semibold uppercase tracking-wider text-primary/70">
              AI ile Revize Et
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-tight -mt-1">
            Bölüm stilini nasıl güncelleyelim? AI mevcut stili yönergeye göre düzenler ve Türkçe özeti yeniler.
          </p>
          <textarea
            className="w-full text-xs min-h-[80px] resize-none rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50 scrollbar-thin transition-colors"
            placeholder={`Örn: "Renk paletini daha soğuk ve mavi tonlara çek"\n"Gece atmosferini ön plana al"\n"Film grain efektini kaldır"\n\n(Ctrl+Enter ile uygula)`}
            value={revisionInstruction}
            onChange={(e) => setRevisionInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRevising}
          />
          <Button
            size="sm"
            className="w-full gap-2 text-xs h-8"
            onClick={handleApply}
            disabled={isRevising || !revisionInstruction.trim()}
          >
            {isRevising ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Revize ediliyor...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Uygula
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Clock, RefreshCw } from 'lucide-react';

interface EpisodeStylePanelProps {
  episodePrompt: string;
  episodePromptTr: string;
  onSetEpisodePrompt: (prompt: string) => void;
  onSetEpisodePromptTr: (prompt: string) => void;
  onReviseEpisodePrompt: (instruction: string) => Promise<void>;
  isRevising?: boolean;
  onClose: () => void;
  onShowHistory: () => void;
  historyCount?: number;
  onRegenerateAll: () => void;
  isGeneratingAll?: boolean;
  sceneCount?: number;
}

export function EpisodeStylePanel({
  episodePrompt,
  episodePromptTr,
  onSetEpisodePrompt,
  onSetEpisodePromptTr,
  onReviseEpisodePrompt,
  isRevising = false,
  onClose,
  onShowHistory,
  historyCount = 0,
  onRegenerateAll,
  isGeneratingAll = false,
  sceneCount = 0,
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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">🎨 Bölüm Stili</span>
        <div className="flex items-center gap-1">
          {/* Geçmiş butonu */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary relative"
            onClick={onShowHistory}
            title="Stil geçmişini görüntüle"
          >
            <Clock className="h-3.5 w-3.5" />
            {historyCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center font-bold">
                {historyCount > 9 ? '9+' : historyCount}
              </span>
            )}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={onClose}>✕</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Türkçe özet — salt okunur */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/80 mb-1 block">
            Türkçe Açıklama (AI Özeti)
          </label>
          <p className="text-[10px] text-amber-500/60 mb-2 leading-tight">
            Yapay zekanın İngilizce stili nasıl anladığına dair özet. Değiştirilemez.
          </p>
          <textarea
            className="w-full text-[11px] h-[70px] resize-none rounded-md border border-amber-800/30 bg-amber-950/20 px-2 py-1.5 text-amber-100 placeholder:text-amber-700/50 focus:outline-none scrollbar-thin cursor-default leading-tight"
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
            className="w-full flex-1 text-[11px] resize-none rounded-md border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary scrollbar-thin min-h-[80px] leading-relaxed"
            placeholder="Örn: Kabus atmosferi, karanlık ve sisli, 35mm film grain..."
            value={episodePrompt || ''}
            onChange={(e) => onSetEpisodePrompt(e.target.value)}
          />
        </div>

        {/* AI oluşturma bölümü */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3 h-3 text-primary/70" />
            <label className="text-xs font-semibold uppercase tracking-wider text-primary/70">
              AI ile Oluştur
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-tight -mt-1">
            Aşağıya ne istediğini yaz, AI mevcut stili yönergeye göre yeniden oluşturur ve Türkçe özeti günceller.
          </p>
          <textarea
            className="w-full text-[11px] h-[60px] resize-none rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50 scrollbar-thin transition-colors leading-snug"
            placeholder={`Örn: "Renk paletini daha soğuk ve mavi tonlara çek"\n(Ctrl+Enter ile oluştur)`}
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
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Oluştur
              </>
            )}
          </Button>
        </div>

        {/* Tümünü Yeniden Üret bölümü */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <RefreshCw className="w-3 h-3 text-orange-500/70" />
            <label className="text-xs font-semibold uppercase tracking-wider text-orange-500/70">
              Promptları Yenile
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-tight">
            Yeni bölüm stilini kullanarak tüm sahneler için promptları baştan üretir.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 text-xs h-8 border-orange-500/30 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            onClick={onRegenerateAll}
            disabled={isGeneratingAll || isRevising}
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Üretiliyor...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Tümünü Yeniden Üret
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

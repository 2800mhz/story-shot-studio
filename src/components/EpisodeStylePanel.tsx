import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface EpisodeStylePanelProps {
  episodePrompt: string;
  episodePromptTr: string;
  onSetEpisodePrompt: (prompt: string) => void;
  onSetEpisodePromptTr: (prompt: string) => void;
  onClose: () => void;
  onBulkRevise?: (instruction: string) => void;
  bulkReviseProgress?: { done: number; total: number; isRunning: boolean };
}

export function EpisodeStylePanel({
  episodePrompt,
  episodePromptTr,
  onSetEpisodePrompt,
  onSetEpisodePromptTr,
  onClose,
  onBulkRevise,
  bulkReviseProgress,
}: EpisodeStylePanelProps) {
  const [revisionInstruction, setRevisionInstruction] = useState('');

  const isRunning = bulkReviseProgress?.isRunning ?? false;
  const canRevise = revisionInstruction.trim().length > 0 && !isRunning;

  const handleRevise = () => {
    if (canRevise && onBulkRevise) {
      onBulkRevise(revisionInstruction.trim());
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">🎨 Bölüm Stili</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={onClose}>✕</Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Turkish summary (read-only) */}
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

        {/* Episode prompt (editable) */}
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

        {/* Bulk revision section */}
        <div className="flex flex-col border border-border rounded-md p-3 bg-muted/20 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-purple-400/90 mb-1 block">
              🔄 Toplu Prompt Revizyonu
            </label>
            <p className="text-[10px] text-muted-foreground/80 leading-tight">
              Tüm üretilmiş promptları bu talimata göre yeniden düzenler. Orijinaller versiyon geçmişinde korunur.
            </p>
          </div>

          <textarea
            className="w-full text-xs min-h-[90px] resize-none rounded-md border border-purple-800/40 bg-purple-950/20 px-3 py-2 text-purple-100 placeholder:text-purple-700/50 focus:outline-none focus:ring-1 focus:ring-purple-500 scrollbar-thin disabled:opacity-50"
            placeholder="Örn: Görüntü daha renksiz ve soğuk olsun, antik Türk dönemi atmosferi daha baskın olsun, soyut varlıklar daha gizemli görünsün..."
            value={revisionInstruction}
            onChange={(e) => setRevisionInstruction(e.target.value)}
            disabled={isRunning}
          />

          {isRunning && bulkReviseProgress && (
            <div className="flex items-center gap-2 text-[10px] text-purple-400/80">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                {bulkReviseProgress.done} / {bulkReviseProgress.total} prompt revize edildi...
              </span>
            </div>
          )}

          <Button
            size="sm"
            className="w-full gap-2 bg-purple-700 hover:bg-purple-600 text-white text-xs disabled:opacity-50"
            onClick={handleRevise}
            disabled={!canRevise}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Revize ediliyor...
              </>
            ) : (
              <>🔄 Tüm Promptları Revize Et</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { X, Clock, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EpisodeStyleVersion } from '@/types';

interface EpisodeStyleHistoryModalProps {
  history: EpisodeStyleVersion[];
  currentPrompt: string;
  onRestore: (version: EpisodeStyleVersion) => void;
  onClose: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function EpisodeStyleHistoryModal({
  history,
  currentPrompt,
  onRestore,
  onClose,
}: EpisodeStyleHistoryModalProps) {
  // ESC ile kapat
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Bölüm Stili Geçmişi</span>
            {history.length > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {history.length} sürüm
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Henüz geçmiş sürüm yok.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                "AI ile Oluştur" ile stil ürettikçe geçmiş burada görünür.
              </p>
            </div>
          )}

          {history.map((version, idx) => {
            const isCurrent = version.prompt === currentPrompt;
            return (
              <div
                key={version.id}
                className={`rounded-lg border overflow-hidden transition-colors ${
                  isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}
              >
                {/* Version header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                  <Wand2 className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {version.instruction ? (
                      <span className="text-[11px] text-amber-600 italic truncate block">
                        💡 "{version.instruction}"
                      </span>
                    ) : (
                      <span className="text-[11px] text-purple-600 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> İlk oluşturma
                      </span>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded shrink-0">
                      ✓ Aktif
                    </span>
                  )}
                  {idx === 0 && !isCurrent && (
                    <span className="text-[10px] text-muted-foreground shrink-0">en yeni</span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                    {formatDate(version.createdAt)}
                  </span>
                </div>

                {/* Content */}
                <div className="px-3 py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Türkçe özet */}
                    {version.promptTr && (
                      <p className="text-[11px] text-amber-700/80 font-medium leading-snug">
                        🇹🇷 {version.promptTr}
                      </p>
                    )}
                    {/* İngilizce prompt önizleme */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-mono line-clamp-3">
                      {version.prompt}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 text-xs gap-1 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => { onRestore(version); onClose(); }}
                    disabled={isCurrent}
                    title={isCurrent ? 'Bu sürüm zaten aktif' : 'Bu sürümü geri yükle'}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Geri Yükle
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <p className="text-[10px] text-muted-foreground">
            Her satır bir AI oluşturma turunu gösterir. "Geri Yükle" ile o sürümü aktif hale getirebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}

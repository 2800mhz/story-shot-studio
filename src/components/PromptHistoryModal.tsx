import React, { useEffect, useState } from 'react';
import { X, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPromptHistory } from '@/lib/supabaseQueries';

interface HistoryEntry {
  id: string;
  shot_type: string;
  prompt_text: string;
  created_at: string;
  type?: string;
}

interface PromptHistoryModalProps {
  sceneId: string;
  onRestore: (entry: HistoryEntry) => void;
  onClose: () => void;
}

export function PromptHistoryModal({ sceneId, onRestore, onClose }: PromptHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPromptHistory(sceneId)
      .then(data => { if (active) setHistory(data as HistoryEntry[]); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sceneId]);

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleRestore = async (entry: HistoryEntry) => {
    setRestoringId(entry.id);
    onRestore(entry);
    // Give the parent a moment to update state then close
    setTimeout(() => { setRestoringId(null); onClose(); }, 600);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Önceki Prompt Versiyonları</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Geçmiş yükleniyor...</span>
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Henüz başka versiyon üretilmedi.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Prompt yeniden üretildiğinde eski versiyonlar burada görünür.
              </p>
            </div>
          )}

          {!loading && history.map(entry => (
            <div
              key={entry.id}
              className="group rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                      {entry.shot_type || entry.type || 'Prompt'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/70 leading-relaxed font-mono line-clamp-3">
                    {entry.prompt_text}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-xs gap-1 text-primary hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRestore(entry)}
                  disabled={restoringId === entry.id}
                >
                  {restoringId === entry.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <RotateCcw className="h-3 w-3" />
                  }
                  Geri Yükle
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <p className="text-[10px] text-muted-foreground">
            Bir versiyona tıklayarak o promptu sahneye geri yükleyebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}

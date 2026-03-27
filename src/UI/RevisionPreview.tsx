import React from 'react';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RevisionPreviewItem } from '../Types/Revision.types';

interface RevisionPreviewProps {
  items: RevisionPreviewItem[];
  onAccept: (sceneId: string, promptId: string) => void;
  onReject: (sceneId: string, promptId: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

function DiffView({ original, revised }: { original: string; revised: string }) {
  const [view, setView] = React.useState<'revised' | 'original' | 'split'>('revised');

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(['revised', 'original', 'split'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              view === v
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {v === 'revised' ? 'Yeni' : v === 'original' ? 'Orijinal' : 'Karşılaştır'}
          </button>
        ))}
      </div>

      {view === 'split' ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Orijinal</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground bg-secondary/50 rounded p-2">
              {original}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-green-500 mb-1">Yeni</p>
            <p className="text-[11px] leading-relaxed bg-green-950/20 text-green-100 rounded p-2">
              {revised}
            </p>
          </div>
        </div>
      ) : (
        <p
          className={`text-[11px] leading-relaxed rounded p-2 ${
            view === 'original'
              ? 'text-muted-foreground bg-secondary/50'
              : 'text-green-100 bg-green-950/20'
          }`}
        >
          {view === 'original' ? original : revised}
        </p>
      )}
    </div>
  );
}

export function RevisionPreview({
  items,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
}: RevisionPreviewProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const total = items.length;
  const accepted = items.filter(i => i.accepted === true).length;
  const rejected = items.filter(i => i.accepted === false).length;
  const pending = total - accepted - rejected;

  const current = items[currentIndex];

  if (!current) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Önizleme verisi yok.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-400 border-green-800">
            ✓ {accepted}
          </Badge>
          <Badge variant="outline" className="text-red-400 border-red-800">
            ✗ {rejected}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            ⋯ {pending}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-6 text-[10px] text-green-400 hover:text-green-300" onClick={onAcceptAll}>
            Tümünü Kabul Et
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-400 hover:text-red-300" onClick={onRejectAll}>
            Tümünü Reddet
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(i => i - 1)}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span>
          Sahne {current.sceneNumber} · {current.shotType} ({currentIndex + 1}/{total})
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          disabled={currentIndex === total - 1}
          onClick={() => setCurrentIndex(i => i + 1)}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Diff view */}
      <ScrollArea className="max-h-64">
        <DiffView original={current.originalText} revised={current.revisedText} />
      </ScrollArea>

      {/* Accept / Reject */}
      <div className="flex gap-2 justify-end">
        {current.accepted === undefined && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-400 hover:text-red-300 border-red-900"
              onClick={() => {
                onReject(current.sceneId, current.promptId);
                if (currentIndex < total - 1) setCurrentIndex(i => i + 1);
              }}
            >
              <X className="h-3 w-3 mr-1" /> Reddet
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-green-700 hover:bg-green-600"
              onClick={() => {
                onAccept(current.sceneId, current.promptId);
                if (currentIndex < total - 1) setCurrentIndex(i => i + 1);
              }}
            >
              <Check className="h-3 w-3 mr-1" /> Kabul Et
            </Button>
          </>
        )}
        {current.accepted === true && (
          <Badge className="bg-green-800 text-green-100">✓ Kabul Edildi</Badge>
        )}
        {current.accepted === false && (
          <Badge className="bg-red-900 text-red-100">✗ Reddedildi</Badge>
        )}
      </div>
    </div>
  );
}

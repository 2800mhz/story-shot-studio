import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, ChevronDown, ChevronUp, Pin, X, ImageIcon } from 'lucide-react';
import type { PromptCard } from '@/types';

/** Minimum progress bar fill width (%) to keep the bar visible even at 0% progress */
const MIN_PROGRESS_BAR_WIDTH = 2;

interface TimelapseStageCardProps {
  prompt: PromptCard;
  sceneId: string;
  onRevise?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDelete?: (sceneId: string, promptId: string) => void;
  onPin?: (sceneId: string, promptId: string) => void;
}

function TimelapseStageCard({ prompt, sceneId, onRevise, onDelete, onPin }: TimelapseStageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instruction, setInstruction] = useState('');

  const progressPercent = prompt.timeProgress ?? 0;

  const submitRevision = async () => {
    if (!instruction.trim() || !onRevise) return;
    setIsSubmitting(true);
    try {
      await onRevise(sceneId, prompt.id, instruction);
    } finally {
      setIsSubmitting(false);
      setIsRevising(false);
      setInstruction('');
    }
  };

  return (
    <div
      className={`relative border rounded-md p-2.5 my-2 transition-all ${
        prompt.isPinned ? 'border-purple-500 ring-1 ring-purple-500/40 bg-purple-500/5' : 'bg-muted/10 border-border'
      } ${isSubmitting ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {isSubmitting && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-md">
          <div className="flex flex-col items-center text-purple-500">
            <RefreshCw className="h-5 w-5 animate-spin mb-1" />
            <span className="text-[10px] font-medium">Revize Ediliyor...</span>
          </div>
        </div>
      )}

      {/* Stage header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
            {prompt.timelapseStageNumber ?? '?'}
          </span>
          <span className="text-xs font-semibold text-purple-300 truncate">
            {prompt.stageLabel ?? prompt.shotType}
          </span>
          {prompt.aspectRatio && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {prompt.aspectRatio}
            </Badge>
          )}
          {prompt.hasSubjectReference && (
            <span className="inline-flex items-center border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] px-1.5 py-0.5 rounded gap-1 shrink-0">
              <ImageIcon className="h-3 w-3" /> ref
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRevise && !isRevising && (
            <button
              onClick={() => setIsRevising(true)}
              className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:text-foreground hover:border-purple-500/50 transition-colors"
              title="Revize et"
            >
              revize
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(sceneId, prompt.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              title="Sil"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(prompt.promptText)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            title="Kopyala"
          >
            <Copy className="h-3 w-3" />
          </button>
          {onPin && (
            <button
              onClick={() => onPin(sceneId, prompt.id)}
              className={`rounded p-0.5 transition-colors ${
                prompt.isPinned ? 'text-purple-400' : 'text-muted-foreground hover:text-purple-400'
              }`}
              title={prompt.isPinned ? 'Raptiye kaldır' : 'Raptiye bas'}
            >
              <Pin className={`h-3.5 w-3.5 ${prompt.isPinned ? 'fill-purple-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-muted-foreground">Zaman İlerlemesi</span>
          <span className="text-[10px] text-purple-400 font-medium">{progressPercent}%</span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all"
            style={{ width: `${Math.max(MIN_PROGRESS_BAR_WIDTH, progressPercent)}%` }}
          />
        </div>
      </div>

      {prompt.explanation && (
        <div className="text-[11px] text-muted-foreground italic border-l-2 border-purple-500/30 pl-2 mb-1">
          "{prompt.explanation}"
        </div>
      )}

      <div
        className={`text-[11px] font-mono leading-relaxed text-foreground/80 bg-muted/20 rounded p-2 ${
          expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
        }`}
      >
        {prompt.promptText}
      </div>
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'daralt' : 'genişlet'}
      </button>

      {/* Revision UI */}
      {isRevising && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <textarea
            className="w-full text-[11px] p-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[50px] resize-none mb-1"
            placeholder="Ne değişsin? Örn: Hava karlı olsun."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitRevision();
              }
            }}
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsRevising(false)} className="h-6 text-[10px] px-2">
              İptal
            </Button>
            <Button
              size="sm"
              onClick={submitRevision}
              disabled={!instruction.trim() || isSubmitting}
              className="h-6 text-[10px] px-2 bg-purple-600 hover:bg-purple-700"
            >
              Uygula
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelapseCardProps {
  prompts: PromptCard[];
  sceneId: string;
  sceneNumber: number;
  onRevise?: (sceneId: string, promptId: string, instruction: string) => Promise<void>;
  onDelete?: (sceneId: string, promptId: string) => void;
  onPin?: (sceneId: string, promptId: string) => void;
}

/**
 * Dedicated UI for timelapse prompt sequences.
 * Displays each stage with a progress bar, stage number, and label.
 * Visually distinct from the standard 3-shot prompt card layout.
 */
export function TimelapseCard({ prompts, sceneId, sceneNumber, onRevise, onDelete, onPin }: TimelapseCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const stageCount = prompts.length;

  return (
    <div className="rounded-lg border border-purple-500/40 bg-purple-950/10 shadow-sm">
      {/* Timelapse header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none bg-purple-500/10 rounded-t-lg border-b border-purple-500/30"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🎞️</span>
          <span className="text-xs font-semibold text-purple-300">
            Timelapse Dizisi
          </span>
          <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30">
            {stageCount} aşama
          </Badge>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3">
          {/* Stage list */}
          {prompts
            .slice()
            .sort((a, b) => (a.timelapseStageNumber ?? 0) - (b.timelapseStageNumber ?? 0))
            .map(prompt => (
              <TimelapseStageCard
                key={prompt.id}
                prompt={prompt}
                sceneId={sceneId}
                onRevise={onRevise}
                onDelete={onDelete}
                onPin={onPin}
              />
            ))}
        </div>
      )}
    </div>
  );
}

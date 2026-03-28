import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProgressionStage } from '@/types';

const HEIGHT_LABELS: Record<ProgressionStage['cameraDirection']['height'], string> = {
  ground: '🏕️ Ground',
  low: '🏔️ Low',
  medium: '🏙️ Medium',
  high: '🗼 High',
  aerial: '🛩️ Aerial',
};

const MIN_PROGRESS_BAR_WIDTH = 2;

interface ProgressionPromptBlockProps {
  stage: ProgressionStage;
  narrativeId: string;
  isActive?: boolean;
  onRevise?: (narrativeId: string, stageNumber: number, instruction: string) => Promise<void>;
  onClick?: () => void;
}

/**
 * Displays a single stage prompt within a progression narrative.
 * Shows stage metadata, camera height, environmental state, and the generated prompt.
 */
export function ProgressionPromptBlock({
  stage,
  narrativeId,
  isActive,
  onRevise,
  onClick,
}: ProgressionPromptBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instruction, setInstruction] = useState('');

  const hasPrompt = !!stage.generatedPrompt;

  const submitRevision = async () => {
    if (!instruction.trim() || !onRevise) return;
    setIsSubmitting(true);
    try {
      await onRevise(narrativeId, stage.number, instruction);
    } finally {
      setIsSubmitting(false);
      setIsRevising(false);
      setInstruction('');
    }
  };

  return (
    <div
      className={`relative border rounded-md p-2.5 transition-all cursor-pointer ${
        isActive
          ? 'border-purple-400 ring-1 ring-purple-400/40 bg-purple-500/10'
          : 'bg-muted/10 border-border hover:border-purple-500/30'
      } ${isSubmitting ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={onClick}
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
          {/* Stage number */}
          <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
            {stage.number}
          </span>
          {/* Stage label */}
          <span className="text-xs font-semibold text-purple-300 truncate">
            {stage.label}
          </span>
          {/* Camera height badge */}
          <Badge variant="secondary" className="text-[9px] shrink-0 bg-blue-500/10 text-blue-300 border-blue-500/20">
            {HEIGHT_LABELS[stage.cameraDirection.height] || stage.cameraDirection.height}
          </Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {hasPrompt && onRevise && !isRevising && (
            <button
              onClick={() => setIsRevising(true)}
              className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:text-foreground hover:border-purple-500/50 transition-colors"
              title="Revize et"
            >
              revize
            </button>
          )}
          {hasPrompt && (
            <button
              onClick={() => navigator.clipboard.writeText(stage.generatedPrompt!)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              title="Kopyala"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] text-muted-foreground">{stage.environmentalState.timeframeDescription}</span>
          <span className="text-[9px] text-purple-400 font-medium">{stage.timeProgress}%</span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full"
            style={{ width: `${Math.max(MIN_PROGRESS_BAR_WIDTH, stage.timeProgress)}%` }}
          />
        </div>
      </div>

      {/* Environmental state summary */}
      <div className="mb-1.5 text-[10px] text-amber-300/80 border-l-2 border-amber-500/30 pl-2">
        ⚓ {stage.environmentalState.anchorState}
      </div>

      {stage.environmentalState.primaryChange && (
        <div className="text-[10px] text-muted-foreground italic mb-1.5">
          {stage.environmentalState.primaryChange}
        </div>
      )}

      {/* Prompt text or placeholder */}
      {hasPrompt ? (
        <>
          <div
            className={`text-[11px] font-mono leading-relaxed text-foreground/80 bg-muted/20 rounded p-2 ${
              expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
            }`}
          >
            {stage.generatedPrompt}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
            className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'daralt' : 'genişlet'}
          </button>
        </>
      ) : (
        <div className="text-[11px] text-muted-foreground/40 italic p-2 bg-muted/10 rounded">
          Henüz prompt üretilmedi...
        </div>
      )}

      {/* Symbolic elements */}
      {stage.environmentalState.symbolicElements.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {stage.environmentalState.symbolicElements.map(el => (
            <span key={el} className="text-[9px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
              {el}
            </span>
          ))}
        </div>
      )}

      {/* Revision UI */}
      {isRevising && (
        <div className="mt-2 pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <textarea
            className="w-full text-[11px] p-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 min-h-[50px] resize-none mb-1"
            placeholder="Ne değişsin? Örn: Hava karlı olsun."
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={e => {
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

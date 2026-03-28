import React from 'react';
import type { ProgressionStage } from '@/types';

interface ProgressionTimelineProps {
  stages: ProgressionStage[];
  activeStage?: number;
  onStageClick?: (stageNumber: number) => void;
}

const HEIGHT_ICONS: Record<ProgressionStage['cameraDirection']['height'], string> = {
  ground: '🏕️',
  low: '🏔️',
  medium: '🏙️',
  high: '🗼',
  aerial: '🛩️',
};

/**
 * Visual horizontal timeline showing all stages of an architectural narrative progression.
 * Clicking a stage node calls onStageClick with the stage number.
 */
export function ProgressionTimeline({ stages, activeStage, onStageClick }: ProgressionTimelineProps) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-start min-w-max gap-0">
        {stages.map((stage, idx) => {
          const isActive = activeStage === stage.number;
          const isFirst = idx === 0;
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.number} className="flex items-start">
              {/* Connector line before node (not for first) */}
              {!isFirst && (
                <div className="flex items-center mt-[18px]">
                  <div className="h-[2px] w-6 bg-purple-500/40" />
                  <span className="text-[9px] text-purple-400/60 mx-0.5">→</span>
                </div>
              )}

              {/* Stage node */}
              <button
                onClick={() => onStageClick?.(stage.number)}
                className={`flex flex-col items-center group transition-all ${
                  onStageClick ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Circle node */}
                <div
                  className={`relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all ${
                    isActive
                      ? 'border-purple-400 bg-purple-500/30 ring-2 ring-purple-400/30'
                      : 'border-purple-500/40 bg-purple-900/20 hover:border-purple-400/70 hover:bg-purple-500/20'
                  }`}
                  title={`Stage ${stage.number}: ${stage.label}`}
                >
                  <span className="text-[11px]">
                    {HEIGHT_ICONS[stage.cameraDirection.height] || '📷'}
                  </span>
                  {/* Stage number badge */}
                  <span
                    className={`absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                      isActive
                        ? 'bg-purple-400 text-purple-950'
                        : 'bg-purple-700/60 text-purple-200'
                    }`}
                  >
                    {stage.number}
                  </span>
                </div>

                {/* Progress percentage */}
                <span className={`text-[9px] mt-0.5 font-medium ${isActive ? 'text-purple-300' : 'text-muted-foreground/60'}`}>
                  {stage.timeProgress}%
                </span>

                {/* Stage label — truncated */}
                <span
                  className={`text-[9px] max-w-[64px] text-center leading-tight truncate ${
                    isActive ? 'text-purple-300' : 'text-muted-foreground/50 group-hover:text-muted-foreground/80'
                  }`}
                  title={stage.label}
                >
                  {stage.label}
                </span>

                {/* "Done" indicator if prompt generated */}
                {stage.generatedPrompt && (
                  <span className="text-[8px] text-emerald-400/70 mt-0.5">✓</span>
                )}
              </button>

              {/* Connector line after last node */}
              {isLast && (
                <div className="flex items-center mt-[18px]">
                  <span className="text-[10px] text-purple-400/40 ml-1">⬛</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

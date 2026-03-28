import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Trash2, RefreshCw, Lock, Anchor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressionTimeline } from './ProgressionTimeline';
import { ProgressionPromptBlock } from './ProgressionPromptBlock';
import type { ProgressionNarrative } from '@/types';

const PROGRESSION_TYPE_LABELS: Record<string, string> = {
  urban_growth: '🏙️ Kent Büyümesi',
  environmental_transformation: '🌍 Çevre Dönüşümü',
  temporal_cycle: '🔄 Zamansal Döngü',
  geological_process: '⛰️ Jeolojik Süreç',
  biological_metamorphosis: '🦋 Biyolojik Metamorfoz',
  civilization_arc: '📜 Medeniyet Arası',
  seasonal_cycle: '🌳 Mevsimsel Döngü',
  custom: '✨ Özel',
};

const CAMERA_STRATEGY_LABELS: Record<string, string> = {
  progressive_elevation: '📐 Aşamalı Yükseliş',
  circular_orbit: '🔁 Dairesel Yörünge',
  linear_approach: '➡️ Doğrusal Yaklaşım',
  zoom_out: '🔭 Zoom Geri',
  fixed_with_change: '🔒 Sabit Kamera',
  custom: '🎥 Özel Kamera',
};

interface ProgressionNarrativeCardProps {
  progression: ProgressionNarrative;
  isActive?: boolean;
  onSelect?: () => void;
  onGenerate?: (narrativeId: string) => void;
  onDelete?: (narrativeId: string) => void;
  onRevise?: (narrativeId: string, stageNumber: number, instruction: string) => Promise<void>;
}

/**
 * Visually distinct card for displaying a progression narrative.
 * Shows narrative metadata (type, anchor, camera strategy), a stage timeline,
 * and the generated prompts for each stage.
 *
 * Works for ANY progression type: city growth, lake drying, glacier melting,
 * moon phases, forest growth, seasonal changes, etc.
 */
export function ProgressionNarrativeCard({
  progression,
  isActive,
  onSelect,
  onGenerate,
  onDelete,
  onRevise,
}: ProgressionNarrativeCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeStage, setActiveStage] = useState<number | undefined>(undefined);

  const { stages, anchor, cameraProgression, type, subject, transformationDriver, status } = progression;
  const stageCount = stages.length;
  const generatedCount = stages.filter(s => s.generatedPrompt).length;
  const isGenerating = status === 'generating';
  const isDone = status === 'done' || generatedCount > 0;

  return (
    <div
      className={`rounded-lg border-2 shadow-sm transition-all ${
        isActive
          ? 'border-amber-500/70 ring-2 ring-amber-500/20'
          : 'border-amber-500/30 hover:border-amber-500/50'
      } bg-gradient-to-br from-amber-950/30 via-purple-950/20 to-background`}
      onClick={onSelect}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none bg-gradient-to-r from-amber-500/15 to-purple-500/10 rounded-t-lg border-b border-amber-500/20"
        onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Type icon */}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-amber-700 border-amber-500/50 bg-amber-500/20 shrink-0">
            🎞️ Timelapse
          </Badge>

          {/* Subject + type */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-amber-300 truncate">
              {subject}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {PROGRESSION_TYPE_LABELS[type] || type}
            </span>
          </div>

          {/* Stage count badge */}
          <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30 shrink-0">
            {stageCount} aşama
          </Badge>

          {/* Status badge */}
          {isGenerating && (
            <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 shrink-0">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Üretiliyor...
            </span>
          )}
          {isDone && !isGenerating && (
            <span className="text-[10px] text-emerald-400 shrink-0">
              ✓ {generatedCount}/{stageCount}
            </span>
          )}
        </div>

        <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3" onClick={e => e.stopPropagation()}>
          {/* ── Metadata panel ── */}
          <div className="mb-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] space-y-1.5">
            {/* Anchor info */}
            <div className="flex items-start gap-2">
              <Anchor className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">{anchor.name}</span>
                <span className="text-muted-foreground ml-1">({anchor.role})</span>
                {anchor.symbolism && (
                  <p className="text-muted-foreground/70 mt-0.5 text-[10px]">{anchor.symbolism}</p>
                )}
              </div>
            </div>

            {/* Camera strategy */}
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-emerald-300">
                {CAMERA_STRATEGY_LABELS[cameraProgression.strategy] || cameraProgression.strategy}
              </span>
              {cameraProgression.description && (
                <span className="text-muted-foreground/60 text-[10px] truncate">
                  — {cameraProgression.description}
                </span>
              )}
            </div>

            {/* Transformation driver */}
            {transformationDriver && (
              <div className="text-muted-foreground/70 text-[10px]">
                🔄 <span className="text-foreground/60">{transformationDriver}</span>
              </div>
            )}
          </div>

          {/* ── Stage timeline ── */}
          <div className="mb-3">
            <ProgressionTimeline
              stages={stages}
              activeStage={activeStage}
              onStageClick={setActiveStage}
            />
          </div>

          {/* ── Action buttons ── */}
          <div className="flex items-center gap-2 mb-3">
            {onGenerate && (
              <Button
                size="sm"
                onClick={() => onGenerate(progression.id)}
                disabled={isGenerating}
                className="h-7 text-[11px] px-3 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                    Üretiliyor...
                  </>
                ) : isDone ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Yeniden Üret
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    Prompt Üret
                  </>
                )}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(progression.id)}
                className="h-7 text-[11px] px-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* ── Stage prompts ── */}
          {stages.length > 0 && (
            <div className="space-y-2">
              {/* Show active stage or all stages */}
              {activeStage !== undefined ? (
                (() => {
                  const s = stages.find(st => st.number === activeStage);
                  return s ? (
                    <ProgressionPromptBlock
                      key={s.number}
                      stage={s}
                      narrativeId={progression.id}
                      isActive={true}
                      onRevise={onRevise}
                    />
                  ) : null;
                })()
              ) : (
                stages.map(s => (
                  <ProgressionPromptBlock
                    key={s.number}
                    stage={s}
                    narrativeId={progression.id}
                    isActive={false}
                    onRevise={onRevise}
                    onClick={() => setActiveStage(s.number)}
                  />
                ))
              )}

              {/* "Show all" toggle when a stage is active */}
              {activeStage !== undefined && (
                <button
                  onClick={() => setActiveStage(undefined)}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-1"
                >
                  Tüm aşamaları göster ({stageCount})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

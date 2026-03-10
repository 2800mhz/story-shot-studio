import { Input } from '@/components/ui/input';
import { Bot, X } from 'lucide-react';

interface FloatingToolbarProps {
  position: { top: number; left: number };
  onAnalyzeWithAI: () => void;
  onDismiss: () => void;
  isAnalyzing?: boolean;
  maxScenes: number;
  onMaxScenesChange: (value: number) => void;
}

export function FloatingToolbar({ position, onAnalyzeWithAI, onDismiss, isAnalyzing, maxScenes, onMaxScenesChange }: FloatingToolbarProps) {
  return (
    <div
      className="animate-fade-in pointer-events-auto fixed z-50 flex items-center gap-1 rounded-lg border bg-card p-1.5 shadow-xl"
      style={{ top: position.top - 48, left: position.left }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground shrink-0">Maks sahne:</span>
        <Input
          type="number"
          min={5}
          max={200}
          step={5}
          value={maxScenes}
          onChange={e => onMaxScenesChange(Number(e.target.value))}
          className="h-7 text-xs w-16"
          disabled={isAnalyzing}
        />
      </div>
      <button
        onClick={onAnalyzeWithAI}
        disabled={isAnalyzing}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-60"
      >
        <Bot className="h-3.5 w-3.5" />
        {isAnalyzing ? 'Analiz Ediliyor...' : '🤖 AI ile Analiz Et'}
      </button>
      <button
        onClick={onDismiss}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

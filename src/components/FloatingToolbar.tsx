import { Bot, X } from 'lucide-react';
import { useState } from 'react';

interface FloatingToolbarProps {
  position: { top: number; left: number };
  onAnalyzeWithAI: (targetSceneCount?: number) => void;
  onDismiss: () => void;
  isAnalyzing?: boolean;
}

export function FloatingToolbar({ position, onAnalyzeWithAI, onDismiss, isAnalyzing }: FloatingToolbarProps) {
  const [targetSceneCount, setTargetSceneCount] = useState<string>('');

  return (
    <div
      className="animate-fade-in pointer-events-auto fixed z-50 flex items-center gap-1.5 rounded-lg border bg-card p-1.5 shadow-xl"
      style={{ top: position.top - 48, left: position.left }}
    >
      <input
        type="number"
        min="1"
        placeholder="Hedef Sahne (örn: 45)"
        value={targetSceneCount}
        onChange={(e) => setTargetSceneCount(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onAnalyzeWithAI(targetSceneCount ? parseInt(targetSceneCount, 10) : undefined);
          }
        }}
        className="h-8 w-[140px] rounded-md border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={isAnalyzing}
      />
      <button
        onClick={() => onAnalyzeWithAI(targetSceneCount ? parseInt(targetSceneCount, 10) : undefined)}
        disabled={isAnalyzing}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-60"
      >
        <Bot className="h-3.5 w-3.5" />
        {isAnalyzing ? 'Analiz Ediliyor...' : '🤖 AI ile Analiz Et'}
      </button>
      <div className="h-4 w-px bg-border max-sm:hidden" />
      <button
        onClick={onDismiss}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

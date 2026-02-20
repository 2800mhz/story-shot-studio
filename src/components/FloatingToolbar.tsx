import React from 'react';
import { Clapperboard, User, Link2, Plus, X } from 'lucide-react';
import type { SelectionMode, ConsistencyGroup } from '@/types';

interface FloatingToolbarProps {
  position: { top: number; left: number };
  selectionMode: SelectionMode;
  consistencyGroups: ConsistencyGroup[];
  onAddScene: () => void;
  onAddReference: () => void;
  onAddConsistency: (groupId: string | null) => void;
  onAppendToScene: () => void;
  onDismiss: () => void;
  hasScenes: boolean;
}

export function FloatingToolbar({
  position, selectionMode, consistencyGroups,
  onAddScene, onAddReference, onAddConsistency, onAppendToScene, onDismiss, hasScenes,
}: FloatingToolbarProps) {
  const [showGroupPicker, setShowGroupPicker] = React.useState(false);

  const handleConsistencyClick = () => {
    setShowGroupPicker(true);
  };

  return (
    <div
      className="animate-fade-in pointer-events-auto fixed z-50 flex flex-col gap-1 rounded-lg border bg-card p-1.5 shadow-xl"
      style={{ top: position.top - 48, left: position.left }}
    >
      <div className="flex items-center gap-1">
        <button
          onClick={onAddScene}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            selectionMode === 'scene' ? 'bg-primary/25 text-primary ring-1 ring-primary/40' : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          <Clapperboard className="h-3.5 w-3.5" />
          Yeni Sahne
        </button>
        <button
          onClick={onAddReference}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            selectionMode === 'reference' ? 'bg-accent/25 text-accent ring-1 ring-accent/40' : 'bg-accent/10 text-accent hover:bg-accent/20'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Referans
        </button>
        <button
          onClick={handleConsistencyClick}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            selectionMode === 'consistency' ? 'bg-blue-500/25 text-blue-400 ring-1 ring-blue-500/40' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Tutarlılık
        </button>
        {hasScenes && (
          <button
            onClick={onAppendToScene}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selectionMode === 'append' ? 'bg-green-500/25 text-green-400 ring-1 ring-green-500/40' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Ekle
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Consistency Group Picker */}
      {showGroupPicker && (
        <div className="animate-fade-in flex flex-wrap items-center gap-1 border-t pt-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">Grup:</span>
          {consistencyGroups.map(g => (
            <button
              key={g.id}
              onClick={() => { onAddConsistency(g.id); setShowGroupPicker(false); }}
              className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20"
            >
              {g.label}
            </button>
          ))}
          <button
            onClick={() => { onAddConsistency(null); setShowGroupPicker(false); }}
            className="rounded-md border border-dashed border-blue-500/30 px-2 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/10"
          >
            + Yeni Grup
          </button>
        </div>
      )}
    </div>
  );
}

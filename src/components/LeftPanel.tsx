import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, Clapperboard, User, Link2, Plus, GripVertical, Folder, FolderOpen } from 'lucide-react';
import type { Episode, Scene, ConsistencyGroup, SelectionMode } from '@/types';
import { Badge } from '@/components/ui/badge';

interface LeftPanelProps {
  episodes: Episode[];
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
  activeSceneId: string | null;
  selectionMode: SelectionMode;
  mainFileName: string;
  onEpisodeClick: (ep: Episode) => void;
  onSceneClick: (id: string) => void;
  onSetSelectionMode: (mode: SelectionMode) => void;
  onMoveEpisode: (episodeId: string, newParentId: string | null) => void;
  onReorderEpisodes: (episodes: Episode[]) => void;
}

const MODE_CONFIG: { mode: SelectionMode; icon: typeof Clapperboard; label: string; activeClass: string }[] = [
  { mode: 'scene', icon: Clapperboard, label: 'Sahne', activeClass: 'border-primary bg-primary/15 text-primary' },
  { mode: 'reference', icon: User, label: 'Referans', activeClass: 'border-accent bg-accent/15 text-accent' },
  { mode: 'consistency', icon: Link2, label: 'Tutarlı', activeClass: 'border-blue-500 bg-blue-500/15 text-blue-400' },
  { mode: 'append', icon: Plus, label: 'Ekle', activeClass: 'border-green-500 bg-green-500/15 text-green-400' },
];

interface EpisodeNodeProps {
  episode: Episode;
  children: Episode[];
  allEpisodes: Episode[];
  scenes: Scene[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEpisodeClick: (ep: Episode) => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  dropTargetId: string | null;
}

function EpisodeNode({
  episode, children, allEpisodes, scenes, expandedIds, onToggle, onEpisodeClick,
  draggedId, onDragStart, onDragOver, onDrop, onDragEnd, dropTargetId,
}: EpisodeNodeProps) {
  const isExpanded = expandedIds.has(episode.id);
  const hasChildren = children.length > 0;
  const sceneCount = scenes.filter(s => s.episodeTitle === episode.title).length;
  const childSceneCount = children.reduce(
    (sum, ch) => sum + scenes.filter(s => s.episodeTitle === ch.title).length, 0
  );
  const totalScenes = sceneCount + childSceneCount;
  const isDragging = draggedId === episode.id;
  const isDropTarget = dropTargetId === episode.id;

  return (
    <div className={`${isDragging ? 'opacity-40' : ''}`}>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(episode.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOver(e, episode.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, episode.id);
        }}
        onDragEnd={onDragEnd}
        className={`group flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-left text-sm transition-colors hover:bg-secondary cursor-pointer ${
          isDropTarget ? 'ring-1 ring-primary bg-primary/5' : ''
        } ${episode.level > 0 ? 'ml-4' : ''}`}
      >
        <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab" />

        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(episode.id); }}
            className="shrink-0 p-0.5 rounded hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {episode.level === 0 && hasChildren ? (
          isExpanded ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        <span
          className="flex-1 truncate text-xs cursor-pointer"
          onClick={() => onEpisodeClick(episode)}
          title={episode.title}
        >
          {episode.title}
        </span>

        {totalScenes > 0 && (
          <Badge variant="secondary" className="h-4 min-w-[16px] justify-center bg-primary/20 text-primary text-[10px] px-1">
            {totalScenes}
          </Badge>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-border/50 ml-3">
          {children.map(child => {
            const grandChildren = allEpisodes.filter(e => e.parentId === child.id);
            return (
              <EpisodeNode
                key={child.id}
                episode={child}
                children={grandChildren}
                allEpisodes={allEpisodes}
                scenes={scenes}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onEpisodeClick={onEpisodeClick}
                draggedId={draggedId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                dropTargetId={dropTargetId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LeftPanel({
  episodes, scenes, consistencyGroups, activeSceneId, selectionMode,
  mainFileName, onEpisodeClick, onSceneClick, onSetSelectionMode,
  onMoveEpisode, onReorderEpisodes,
}: LeftPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const activeScene = scenes.find(s => s.id === activeSceneId);

  const topLevelEpisodes = useMemo(
    () => episodes.filter(ep => ep.parentId === null),
    [episodes]
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    const parentIds = episodes.filter(ep => episodes.some(c => c.parentId === ep.id)).map(ep => ep.id);
    setExpandedIds(new Set(parentIds));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (_e: React.DragEvent, targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      setDropTargetId(targetId);
    }
  };

  const handleDrop = (_e: React.DragEvent, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedEp = episodes.find(e => e.id === draggedId);
    const targetEp = episodes.find(e => e.id === targetId);
    if (!draggedEp || !targetEp) return;

    // If dropping on a level-0 (parent) episode, make dragged a child
    if (targetEp.level === 0 && draggedEp.level !== 0) {
      onMoveEpisode(draggedId, targetId);
    } else {
      // Reorder: move dragged before/after target
      const newEpisodes = [...episodes];
      const dragIdx = newEpisodes.findIndex(e => e.id === draggedId);
      const targetIdx = newEpisodes.findIndex(e => e.id === targetId);
      if (dragIdx >= 0 && targetIdx >= 0) {
        const [removed] = newEpisodes.splice(dragIdx, 1);
        // If moving to a parent, set parentId
        if (targetEp.parentId !== null) {
          removed.parentId = targetEp.parentId;
          removed.level = 1;
        }
        newEpisodes.splice(targetIdx, 0, removed);
        onReorderEpisodes(newEpisodes);
      }
    }

    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* Selection Mode Buttons */}
      <div className="border-b p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Aktif Mod</p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODE_CONFIG.map(({ mode, icon: Icon, label, activeClass }) => (
            <button
              key={mode}
              onClick={() => onSetSelectionMode(mode)}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                selectionMode === mode
                  ? activeClass
                  : 'border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/30'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Episode Navigator Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Doküman Gezgini
          </h2>
          {episodes.length > 0 && (
            <div className="flex gap-1">
              <button onClick={handleExpandAll} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground" title="Tümünü aç">
                ▼
              </button>
              <button onClick={handleCollapseAll} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground" title="Tümünü kapat">
                ▶
              </button>
            </div>
          )}
        </div>
        {mainFileName && (
          <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="truncate text-xs">{mainFileName}</span>
          </div>
        )}
      </div>

      {/* Episode Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        {episodes.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Henüz doküman yüklenmedi
          </div>
        ) : (
          <div className="space-y-0.5">
            {topLevelEpisodes.map(ep => {
              const children = episodes.filter(e => e.parentId === ep.id);
              return (
                <EpisodeNode
                  key={ep.id}
                  episode={ep}
                  children={children}
                  allEpisodes={episodes}
                  scenes={scenes}
                  expandedIds={expandedIds}
                  onToggle={toggleExpanded}
                  onEpisodeClick={onEpisodeClick}
                  draggedId={draggedId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  dropTargetId={dropTargetId}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Active Scene Preview */}
      {activeScene && (
        <div className="border-t p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Aktif Sahne</p>
          <div className="rounded-md bg-secondary p-2.5 text-xs leading-relaxed text-secondary-foreground">
            {activeScene.segments[0]?.text.slice(0, 120)}...
          </div>
        </div>
      )}
    </div>
  );
}

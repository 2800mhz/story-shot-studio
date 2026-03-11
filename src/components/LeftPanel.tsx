import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, GripVertical, Folder, FolderOpen } from 'lucide-react';
import type { Episode, Scene, ConsistencyGroup } from '@/types';
import { Badge } from '@/components/ui/badge';

interface LeftPanelProps {
  episodes: Episode[];
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
  activeSceneId: string | null;
  mainFileName: string;
  isAnalyzing?: boolean;
  episodePrompt?: string;
  episodePromptTr?: string;
  onSetEpisodePrompt?: (prompt: string) => void;
  onSetEpisodePromptTr?: (prompt: string) => void;
  onEpisodeClick: (ep: Episode) => void;
  onSceneClick: (id: string) => void;
  onMoveEpisode: (episodeId: string, newParentId: string | null) => void;
  onReorderEpisodes: (episodes: Episode[]) => void;
}

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
  activeSceneId: string | null;
  onSceneClick: (id: string) => void;
}

function EpisodeNode({
  episode, children, allEpisodes, scenes, expandedIds, onToggle, onEpisodeClick,
  draggedId, onDragStart, onDragOver, onDrop, onDragEnd, dropTargetId,
  activeSceneId, onSceneClick,
}: EpisodeNodeProps) {
  const isExpanded = expandedIds.has(episode.id);
  const hasChildren = children.length > 0;
  const episodeScenes = scenes.filter(s => s.episodeTitle === episode.title);
  const hasExpandable = hasChildren || episodeScenes.length > 0;
  const childSceneCount = children.reduce(
    (sum, ch) => sum + scenes.filter(s => s.episodeTitle === ch.title).length, 0
  );
  const totalScenes = episodeScenes.length + childSceneCount;
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

        {hasExpandable ? (
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

      {hasExpandable && isExpanded && (
        <div>
          {hasChildren && (
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
                    activeSceneId={activeSceneId}
                    onSceneClick={onSceneClick}
                  />
                );
              })}
            </div>
          )}
          {episodeScenes.length > 0 && (
            <div className="ml-3 space-y-0.5 py-0.5">
              {episodeScenes.map(scene => (
                <button
                  key={scene.id}
                  onClick={() => onSceneClick(scene.id)}
                  className={`w-full text-left rounded-md px-2 py-1.5 transition-colors ${
                    activeSceneId === scene.id
                      ? 'border border-primary bg-primary/5 text-primary'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <div className="text-xs font-medium truncate">
                    {scene.title || `Sahne ${scene.number}`}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {(scene.text || scene.segments[0]?.text || '').substring(0, 60)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LeftPanel({
  episodes, scenes, consistencyGroups, activeSceneId,
  mainFileName, isAnalyzing, episodePrompt, episodePromptTr, onSetEpisodePrompt, onSetEpisodePromptTr,
  onEpisodeClick, onSceneClick,
  onMoveEpisode, onReorderEpisodes,
}: LeftPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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
        {onSetEpisodePrompt && (
          <div className="mt-3">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Bölüm Stili (Episode Prompt)
            </label>
            <p className="text-[10px] text-muted-foreground/80 mb-2 leading-tight">
              Tüm sahneler üretilirken ana vizyon ve atmosfer olarak bu kutudaki kurallar öncelikli baz alınır.
            </p>
            <textarea
              className="w-full text-xs min-h-[60px] resize-none rounded-md border bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary scrollbar-thin"
              placeholder="Örn: Kabus atmosferi, karanlık ve sisli, 35mm film grain..."
              value={episodePrompt || ''}
              onChange={(e) => onSetEpisodePrompt(e.target.value)}
            />
          </div>
        )}
        {onSetEpisodePromptTr && (
          <div className="mt-3">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Türkçe Açıklama (AI Özeti)
            </label>
            <textarea
              className="w-full text-xs min-h-[50px] resize-none rounded-md border border-indigo-200 bg-indigo-50/30 px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-300 scrollbar-thin"
              placeholder="Görsel stilin Türkçe açıklaması burada görünecek..."
              value={episodePromptTr || ''}
              onChange={(e) => onSetEpisodePromptTr(e.target.value)}
            />
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
                  activeSceneId={activeSceneId}
                  onSceneClick={onSceneClick}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

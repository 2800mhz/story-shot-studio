import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, GripVertical, Folder, FolderOpen, Search, SortAsc, SortDesc, Filter, X } from 'lucide-react';
import type { Episode, Scene, ConsistencyGroup } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface LeftPanelProps {
  episodes: Episode[];
  scenes: Scene[];
  consistencyGroups: ConsistencyGroup[];
  activeSceneId: string | null;
  mainFileName: string;
  isAnalyzing?: boolean;
  isLoading?: boolean;
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
          <Badge variant="secondary" className="h-4 justify-center bg-primary/10 text-primary text-[10px] px-1.5 font-bold border border-primary/20">
            {totalScenes} {totalScenes === 1 ? 'Sahne' : 'Sahne'}
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
  mainFileName, isAnalyzing, isLoading,
  onEpisodeClick, onSceneClick,
  onMoveEpisode, onReorderEpisodes,
}: LeftPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'scenes'>('default');

  const filteredEpisodes = useMemo(() => {
    let result = episodes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(ep => ep.title.toLowerCase().includes(term));
    }
    
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'scenes') {
      result = [...result].sort((a, b) => {
        const aCount = scenes.filter(s => s.episodeTitle === a.title).length;
        const bCount = scenes.filter(s => s.episodeTitle === b.title).length;
        return bCount - aCount;
      });
    }
    
    return result;
  }, [episodes, searchTerm, sortBy, scenes]);

  const topLevelEpisodes = useMemo(
    () => filteredEpisodes.filter(ep => ep.parentId === null || !!searchTerm),
    [filteredEpisodes, searchTerm]
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
      <div className="border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
            Doküman Gezgini
          </h2>
          {episodes.length > 0 && (
            <div className="flex gap-1">
              <button 
                onClick={() => setSortBy(prev => prev === 'name' ? 'default' : 'name')} 
                className={`rounded p-1 text-muted-foreground transition-colors hover:bg-secondary ${sortBy === 'name' ? 'text-primary bg-primary/10' : ''}`}
                title="İsme göre sırala"
              >
                <SortAsc className="h-3 w-3" />
              </button>
               <button 
                onClick={() => setSortBy(prev => prev === 'scenes' ? 'default' : 'scenes')} 
                className={`rounded p-1 text-muted-foreground transition-colors hover:bg-secondary ${sortBy === 'scenes' ? 'text-primary bg-primary/10' : ''}`}
                title="Sahne sayısına göre sırala"
              >
                <Filter className="h-3 w-3" />
              </button>
              <button onClick={handleExpandAll} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Tümünü aç">
                <ChevronDown className="h-3 w-3" />
              </button>
              <button onClick={handleCollapseAll} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Tümünü kapat">
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Episode ara..."
            className="h-8 pl-8 pr-7 text-xs bg-secondary/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-background transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {mainFileName && (
          <div className="flex items-center gap-2 rounded-md bg-secondary/30 px-2 py-1.5 border border-border/50">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate text-[11px] font-medium text-foreground/80">{mainFileName}</span>
          </div>
        )}
      </div>

      {/* Episode Tree with Skeleton */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        {isLoading ? (
          <div className="space-y-3 px-2 py-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-6 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        ) : topLevelEpisodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <div className="bg-secondary/40 p-3 rounded-full mb-3">
              <Search className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">
              {searchTerm ? "Sonuç bulunamadı" : "Henüz doküman yüklenmedi"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 animate-in fade-in duration-500">
            {topLevelEpisodes.map(ep => {
              const children = searchTerm ? [] : episodes.filter(e => e.parentId === ep.id);
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

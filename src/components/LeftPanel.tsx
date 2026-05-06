import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  GripVertical,
  Layers3,
  ListTree,
  Search,
  SortAsc,
  X,
} from 'lucide-react';
import type { ConsistencyGroup, Episode, Scene } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

function getSceneText(scene: Scene): string {
  return scene.text || scene.segments[0]?.text || '';
}

function sceneCountForEpisode(episode: Episode, scenes: Scene[]) {
  return scenes.filter((scene) => scene.episodeTitle === episode.title).length;
}

function EpisodeNode({
  episode,
  children,
  allEpisodes,
  scenes,
  expandedIds,
  onToggle,
  onEpisodeClick,
  draggedId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropTargetId,
  activeSceneId,
  onSceneClick,
}: EpisodeNodeProps) {
  const isExpanded = expandedIds.has(episode.id);
  const hasChildren = children.length > 0;
  const episodeScenes = scenes.filter((scene) => scene.episodeTitle === episode.title);
  const hasExpandable = hasChildren || episodeScenes.length > 0;
  const childSceneCount = children.reduce((sum, child) => sum + sceneCountForEpisode(child, scenes), 0);
  const totalScenes = episodeScenes.length + childSceneCount;
  const isDragging = draggedId === episode.id;
  const isDropTarget = dropTargetId === episode.id;
  const hasActiveScene = episodeScenes.some((scene) => scene.id === activeSceneId);

  return (
    <div className={cn(isDragging && 'opacity-40')}>
      <div
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          onDragStart(episode.id);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDragOver(event, episode.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDrop(event, episode.id);
        }}
        onDragEnd={onDragEnd}
        className={cn(
          'group flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-border/80 hover:bg-secondary/55',
          episode.level > 0 && 'ml-4',
          isDropTarget && 'border-primary/60 bg-primary/[0.05]',
          hasActiveScene && 'border-primary/30 bg-primary/[0.035]',
        )}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/35 opacity-0 transition-opacity group-hover:opacity-100" />

        {hasExpandable ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(episode.id);
            }}
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/50',
            episode.level === 0 && hasChildren && 'border-primary/25 bg-primary/[0.06] text-primary',
          )}
        >
          {episode.level === 0 && hasChildren ? (
            isExpanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onEpisodeClick(episode)}
          title={episode.title}
        >
          <span className="block truncate text-xs font-medium text-foreground">{episode.title}</span>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
            {hasChildren ? `${children.length} alt bolum` : episode.level > 0 ? 'Alt bolum' : 'Bolum'}
          </span>
        </button>

        {totalScenes > 0 ? (
          <Badge variant="outline" className="h-5 shrink-0 border-primary/20 bg-primary/[0.06] px-1.5 text-[10px] text-primary">
            {totalScenes}
          </Badge>
        ) : null}
      </div>

      {hasExpandable && isExpanded ? (
        <div className="ml-5 border-l border-border/60 pl-2">
          {hasChildren ? (
            <div className="py-1">
              {children.map((child) => {
                const grandChildren = allEpisodes.filter((item) => item.parentId === child.id);
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
          ) : null}

          {episodeScenes.length > 0 ? (
            <div className="space-y-1 py-1">
              {episodeScenes.map((scene) => {
                const isActive = activeSceneId === scene.id;
                const promptCount = scene.prompts?.length || 0;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => onSceneClick(scene.id)}
                    className={cn(
                      'w-full rounded-lg border px-2.5 py-2 text-left transition-colors',
                      isActive
                        ? 'border-primary/60 bg-primary/[0.06] text-primary'
                        : 'border-transparent text-foreground hover:border-border/70 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          scene.status === 'done' ? 'bg-emerald-400' : scene.status === 'generating' ? 'bg-primary' : 'bg-muted-foreground/50',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {scene.title || `Sahne ${scene.number}`}
                      </span>
                      {promptCount > 0 ? (
                        <span className="shrink-0 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {promptCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 line-clamp-1 pl-3.5 text-[10px] leading-4 text-muted-foreground">
                      {getSceneText(scene).substring(0, 90) || 'Metin yok'}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LeftPanel({
  episodes,
  scenes,
  consistencyGroups,
  activeSceneId,
  mainFileName,
  isAnalyzing,
  isLoading,
  onEpisodeClick,
  onSceneClick,
  onMoveEpisode,
  onReorderEpisodes,
}: LeftPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'scenes'>('default');

  const stats = useMemo(() => {
    const promptCount = scenes.reduce((sum, scene) => sum + (scene.prompts?.length || 0), 0);
    return {
      topLevel: episodes.filter((episode) => episode.parentId === null).length,
      scenes: scenes.length,
      prompts: promptCount,
      groups: consistencyGroups.length,
    };
  }, [consistencyGroups.length, episodes, scenes]);

  const filteredEpisodes = useMemo(() => {
    let result = episodes;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((episode) => {
        const episodeMatch = episode.title.toLowerCase().includes(term);
        const sceneMatch = scenes.some((scene) =>
          scene.episodeTitle === episode.title &&
          `${scene.title || ''} ${getSceneText(scene)}`.toLowerCase().includes(term),
        );
        return episodeMatch || sceneMatch;
      });
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'scenes') {
      result = [...result].sort((a, b) => sceneCountForEpisode(b, scenes) - sceneCountForEpisode(a, scenes));
    }

    return result;
  }, [episodes, scenes, searchTerm, sortBy]);

  const topLevelEpisodes = useMemo(
    () => filteredEpisodes.filter((episode) => episode.parentId === null || !!searchTerm),
    [filteredEpisodes, searchTerm],
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    const expandableIds = episodes
      .filter((episode) => episodes.some((child) => child.parentId === episode.id) || sceneCountForEpisode(episode, scenes) > 0)
      .map((episode) => episode.id);
    setExpandedIds(new Set(expandableIds));
  };

  const handleCollapseAll = () => setExpandedIds(new Set());

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (_event: React.DragEvent, targetId: string) => {
    if (draggedId && draggedId !== targetId) setDropTargetId(targetId);
  };

  const handleDrop = (_event: React.DragEvent, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedEpisode = episodes.find((episode) => episode.id === draggedId);
    const targetEpisode = episodes.find((episode) => episode.id === targetId);
    if (!draggedEpisode || !targetEpisode) return;

    if (targetEpisode.level === 0 && draggedEpisode.level !== 0) {
      onMoveEpisode(draggedId, targetId);
    } else {
      const reordered = [...episodes];
      const dragIndex = reordered.findIndex((episode) => episode.id === draggedId);
      const targetIndex = reordered.findIndex((episode) => episode.id === targetId);
      if (dragIndex >= 0 && targetIndex >= 0) {
        const [removed] = reordered.splice(dragIndex, 1);
        if (targetEpisode.parentId !== null) {
          removed.parentId = targetEpisode.parentId;
          removed.level = 1;
        }
        reordered.splice(targetIndex, 0, removed);
        onReorderEpisodes(reordered);
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
    <div className="flex h-full flex-col border-r border-border/70 bg-card">
      <div className="border-b border-border/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">Workspace</div>
            <h2 className="mt-1 text-base font-semibold text-foreground">Dokuman gezgini</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Episode, sahne ve prompt akisi</p>
          </div>
          {isAnalyzing ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/[0.06] text-[10px] text-primary">
              Analiz
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-background/40 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/[0.06] text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-foreground">{mainFileName || 'Dokuman yuklenmedi'}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {stats.topLevel} episode / {stats.scenes} sahne / {stats.prompts} prompt
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border/70 bg-background/30 px-2 py-2">
            <div className="text-sm font-semibold">{stats.topLevel}</div>
            <div className="text-[10px] text-muted-foreground">episode</div>
          </div>
          <div className="rounded-md border border-border/70 bg-background/30 px-2 py-2">
            <div className="text-sm font-semibold">{stats.scenes}</div>
            <div className="text-[10px] text-muted-foreground">sahne</div>
          </div>
          <div className="rounded-md border border-border/70 bg-background/30 px-2 py-2">
            <div className="text-sm font-semibold">{stats.groups}</div>
            <div className="text-[10px] text-muted-foreground">grup</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Episode veya sahne ara..."
              className="h-8 border-border/70 bg-background/50 pl-8 pr-7 text-xs"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          <div className="flex rounded-md border border-border/70 bg-background/40 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', sortBy === 'name' && 'bg-primary/[0.08] text-primary')}
              onClick={() => setSortBy((previous) => (previous === 'name' ? 'default' : 'name'))}
              title="Isme gore sirala"
            >
              <SortAsc className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', sortBy === 'scenes' && 'bg-primary/[0.08] text-primary')}
              onClick={() => setSortBy((previous) => (previous === 'scenes' ? 'default' : 'scenes'))}
              title="Sahne sayisina gore sirala"
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {episodes.length > 0 ? (
          <div className="mt-3 flex items-center justify-between">
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={handleExpandAll}>
              Tumunu ac
            </button>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={handleCollapseAll}>
              Tumunu kapat
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {isLoading ? (
          <div className="space-y-3 px-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-2.5 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : topLevelEpisodes.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-background/40">
              {searchTerm ? <Search className="h-5 w-5 text-muted-foreground" /> : <ListTree className="h-5 w-5 text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium text-foreground">{searchTerm ? 'Sonuc bulunamadi' : 'Gezgin bos'}</p>
            <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
              {searchTerm ? 'Arama metni episode veya sahne icinde bulunamadi.' : 'Metin yuklediginde episode ve sahne yapisi burada gorunur.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 animate-in fade-in duration-300">
            <div className="mb-2 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              Episode agaci
            </div>
            {topLevelEpisodes.map((episode) => {
              const children = searchTerm ? [] : episodes.filter((item) => item.parentId === episode.id);
              return (
                <EpisodeNode
                  key={episode.id}
                  episode={episode}
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

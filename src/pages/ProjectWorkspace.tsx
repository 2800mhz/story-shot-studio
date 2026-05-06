import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Film, Trash2, FileText, Pencil, Search, SortAsc, Clock, Filter, Zap, Layers3, Palette, Pin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProject, fetchEpisodes, createEpisode, deleteEpisode, updateEpisode, updateProject } from '@/lib/supabaseQueries';
import { saveEpisodePreferences } from '@/lib/episodePreferences';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  getProjectAccent,
  getProjectUiPreference,
  PROJECT_ACCENTS,
  readProjectUiPreferences,
  updateProjectUiPreference,
  type ProjectAccentId,
} from '@/lib/projectUiPreferences';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { ProjectType, RenderMode } from '@/types';

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  created_at: string;
  scene_count?: number;
}

interface Project {
  id: string;
  title: string;
  project_type: ProjectType;
  created_at: string;
  updated_at: string;
}

function projectTypeLabel(type: ProjectType) {
  switch (type) {
    case 'commercial':
      return 'Reklam';
    case 'narrative':
      return 'Kurgu';
    default:
      return 'Belgesel';
  }
}

function renderModeLabel(mode: RenderMode) {
  switch (mode) {
    case 'stylized':
      return 'Stylized';
    case 'illustration':
      return 'Illustration';
    case 'animation':
      return 'Animation';
    default:
      return 'Photoreal';
  }
}

export default function ProjectWorkspace() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeAPI, setActiveAPI] = useState<{ provider: string; label: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'newest' | 'oldest' | 'alphabetical'>('number');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [projectType, setProjectType] = useState<ProjectType>('documentary');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('');
  const [newEpisodeProjectType, setNewEpisodeProjectType] = useState<ProjectType>('documentary');
  const [newEpisodeRenderMode, setNewEpisodeRenderMode] = useState<RenderMode>('photoreal');
  const [projectPrefs, setProjectPrefs] = useState(() => readProjectUiPreferences());

  useEffect(() => {
    if (projectId) {
      loadData();
      fetchActiveAPI();
    }
  }, [projectId]);

  async function fetchActiveAPI() {
    try {
      const { data } = await supabase
        .from('api_keys')
        .select('provider, label')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (data) setActiveAPI(data);
    } catch {
      // ignore
    }
  }

  async function loadData() {
    try {
      const [projectData, episodesData] = await Promise.all([fetchProject(projectId!), fetchEpisodes(projectId!)]);
      setProject(projectData);
      setProjectType((projectData.project_type as ProjectType) || 'documentary');
      setEpisodes(episodesData);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateEpisodeDialog() {
    setNewEpisodeTitle('');
    setNewEpisodeProjectType(projectType);
    setNewEpisodeRenderMode('photoreal');
    setCreateDialogOpen(true);
  }

  async function handleCreateEpisode() {
    if (!projectId) return;
    setCreating(true);
    try {
      const episode = await createEpisode(projectId, newEpisodeTitle.trim());
      saveEpisodePreferences(episode.id, {
        projectType: newEpisodeProjectType,
        renderMode: newEpisodeRenderMode,
      });
      setCreateDialogOpen(false);
      navigate(`/project/${projectId}/episode/${episode.id}`);
    } catch (error) {
      console.error('Error creating episode:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteEpisode(episodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this episode? This action cannot be undone.')) return;
    try {
      await deleteEpisode(episodeId);
      setEpisodes((prev) => prev.filter((episode) => episode.id !== episodeId));
    } catch (error) {
      console.error('Error deleting episode:', error);
    }
  }

  async function handleRenameEpisode(episodeId: string, newTitle: string) {
    if (!newTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateEpisode(episodeId, { title: newTitle.trim() });
      setEpisodes((prev) => prev.map((episode) => (episode.id === episodeId ? { ...episode, title: newTitle.trim() } : episode)));
    } catch (error) {
      console.error('Error renaming episode:', error);
    } finally {
      setEditingId(null);
    }
  }

  async function handleProjectTypeChange(nextType: ProjectType) {
    if (!projectId || !project) return;
    const previous = projectType;
    setProjectType(nextType);
    setProject((prev) => (prev ? { ...prev, project_type: nextType } : prev));
    try {
      await updateProject(projectId, { project_type: nextType });
    } catch (error) {
      console.error('Error updating project type:', error);
      setProjectType(previous);
      setProject((prev) => (prev ? { ...prev, project_type: previous } : prev));
    }
  }

  function toggleProjectPin() {
    if (!projectId) return;
    const current = getProjectUiPreference(projectId, projectPrefs);
    setProjectPrefs(updateProjectUiPreference(projectId, { isPinned: !current.isPinned }));
  }

  function setProjectAccent(projectId: string, accent: ProjectAccentId) {
    setProjectPrefs(updateProjectUiPreference(projectId, { accent }));
  }

  const projectPreference = projectId ? getProjectUiPreference(projectId, projectPrefs) : null;
  const projectAccent = getProjectAccent(projectPreference?.accent);

  const filteredEpisodes = episodes
    .filter((episode) => {
      const matchesSearch = episode.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (dateFilter === 'all') return matchesSearch;

      const createdAt = new Date(episode.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === 'week') return matchesSearch && diffDays <= 7;
      if (dateFilter === 'month') return matchesSearch && diffDays <= 30;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'number') return a.episode_number - b.episode_number;
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      return 0;
    });

  const SkeletonEpisodeCard = () => (
    <Card className="rounded-lg border-border/70 p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-5 h-6 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <div className="mt-8 flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <div className="flex items-center gap-3">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-md border', projectAccent.iconClass)}>
                <Film className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{project?.title || 'Project'}</h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn('hidden h-9 w-9 text-muted-foreground md:inline-flex', projectPreference?.isPinned && projectAccent.textClass)}
              title={projectPreference?.isPinned ? 'Pini kaldir' : 'Dashboard basina pinle'}
              onClick={toggleProjectPin}
            >
              <Pin className={cn('h-4 w-4', projectPreference?.isPinned && 'fill-current')} />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden h-9 w-9 text-muted-foreground md:inline-flex" title="Proje rengini degistir">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="mb-3 text-xs font-medium text-muted-foreground">Proje rengi</div>
                <div className="grid grid-cols-3 gap-2">
                  {PROJECT_ACCENTS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        'flex h-9 items-center justify-center rounded-md border border-border/70 bg-background transition-colors hover:border-foreground/40',
                        projectPreference?.accent === option.id && 'border-foreground/60',
                      )}
                      onClick={() => projectId && setProjectAccent(projectId, option.id)}
                      title={option.label}
                    >
                      <span className={cn('h-4 w-4 rounded-full', option.swatchClass)} />
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {activeAPI ? (
              <Badge variant="outline" className="hidden md:inline-flex border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                <Zap className="mr-1 h-3.5 w-3.5" />
                {activeAPI.label || activeAPI.provider.toUpperCase()}
              </Badge>
            ) : null}
            <Button onClick={openCreateEpisodeDialog} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni bolum
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="border-b border-border/60 pb-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                <Layers3 className={cn('h-3.5 w-3.5', projectAccent.textClass)} />
                Episode workspace
              </div>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">Bolumler</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Her bolum kendi anlatim cizgisi ve render davranisiyla acilsin. Bu ekran episode duzeyindeki ilk kararlarin masasi.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="outline">{episodes.length} bolum</Badge>
                <Badge variant="outline">{projectTypeLabel(projectType)}</Badge>
                {projectPreference?.isPinned ? <Badge variant="outline" className={projectAccent.badgeClass}>Dashboard sabit</Badge> : null}
                <Badge variant="outline">
                  {episodes.reduce((sum, episode) => sum + (episode.scene_count || 0), 0)} toplam sahne
                </Badge>
              </div>
            </div>

            <div className={cn('rounded-lg border p-5 shadow-sm', projectAccent.cardClass)}>
              <div className="text-sm font-semibold">Proje davranisi</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                Buradaki anlatim turu yeni episode acilirken varsayilan davranisi belirler.
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/40 px-3 py-2">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Dashboard sirasi</div>
                    <div className="text-sm">{projectPreference?.isPinned ? 'Basa sabitli' : 'Normal sirada'}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(projectPreference?.isPinned && projectAccent.textClass)}
                    onClick={toggleProjectPin}
                  >
                    <Pin className={cn('h-4 w-4', projectPreference?.isPinned && 'fill-current')} />
                    {projectPreference?.isPinned ? 'Sabit' : 'Pinle'}
                  </Button>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Kart rengi</div>
                  <div className="grid grid-cols-6 gap-2">
                    {PROJECT_ACCENTS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={cn(
                          'flex h-9 items-center justify-center rounded-md border border-border/70 bg-background/50 transition-colors hover:border-foreground/40',
                          projectPreference?.accent === option.id && 'border-foreground/70',
                        )}
                        onClick={() => projectId && setProjectAccent(projectId, option.id)}
                        title={option.label}
                      >
                        {projectPreference?.accent === option.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className={cn('h-4 w-4 rounded-full', option.swatchClass)} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Narrative mode</div>
                  <Select value={projectType} onValueChange={(value: ProjectType) => handleProjectTypeChange(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Proje tipi sec" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="documentary">Belgesel</SelectItem>
                      <SelectItem value="commercial">Reklam / Ticari</SelectItem>
                      <SelectItem value="narrative">Kurgu Film / Dizi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={openCreateEpisodeDialog} disabled={creating} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni bolum ac
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Bolum ara..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={sortBy} onValueChange={(value: 'number' | 'newest' | 'oldest' | 'alphabetical') => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SortAsc className="mr-2 h-4 w-4 opacity-50" />
                  <SelectValue placeholder="Sirala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Bolum no</SelectItem>
                  <SelectItem value="newest">En yeni</SelectItem>
                  <SelectItem value="oldest">En eski</SelectItem>
                  <SelectItem value="alphabetical">Isim A - Z</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(value: 'all' | 'week' | 'month') => setDateFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="mr-2 h-4 w-4 opacity-50" />
                  <SelectValue placeholder="Zaman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum zamanlar</SelectItem>
                  <SelectItem value="week">Son 1 hafta</SelectItem>
                  <SelectItem value="month">Son 1 ay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <SkeletonEpisodeCard key={item} />
                ))}
              </div>
            ) : filteredEpisodes.length === 0 ? (
              <Card className="rounded-lg border-dashed border-border/70 px-8 py-16 text-center">
                <div className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-md border', projectAccent.iconClass)}>
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold">Bolum bulunamadi</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {searchTerm ? `"${searchTerm}" icin sonuc yok.` : 'Bu proje henuz bolum icermiyor. Ilk episode ile acilisi yapabiliriz.'}
                </p>
                {!searchTerm ? (
                  <Button onClick={openCreateEpisodeDialog} disabled={creating} className="mt-6">
                    <Plus className="mr-2 h-4 w-4" />
                    Ilk bolumu olustur
                  </Button>
                ) : null}
              </Card>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredEpisodes.map((episode) => (
                  <Card
                    key={episode.id}
                    className={cn(
                      'group relative cursor-pointer overflow-hidden rounded-lg p-5 transition-colors',
                      projectAccent.cardClass,
                      projectAccent.cardHoverClass,
                    )}
                    onClick={() => navigate(`/project/${projectId}/episode/${episode.id}`)}
                  >
                    <div className={cn('absolute inset-x-0 top-0 h-1', projectAccent.topBarClass)} />
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('flex h-11 w-11 items-center justify-center rounded-md border', projectAccent.iconClass)}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(episode.id);
                            setEditValue(episode.title);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteEpisode(episode.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5">
                      {editingId === episode.id ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleRenameEpisode(episode.id, editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameEpisode(episode.id, editValue);
                              if (e.key === 'Escape') setEditingId(null);
                              e.stopPropagation();
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="min-h-[3.25rem] text-xl font-semibold leading-tight">{episode.title}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className={projectAccent.badgeClass}>Bolum {episode.episode_number}</Badge>
                            <Badge variant="outline">{episode.scene_count || 0} sahne</Badge>
                          </div>
                        </>
                      )}
                    </div>

                    <div className={cn('mt-8 flex items-end justify-between border-t pt-4', projectAccent.dividerClass)}>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(episode.created_at), 'd MMMM yyyy', { locale: tr })}
                        </div>
                        <div className="mt-2 text-sm font-medium text-foreground">Episode workspace'i ac</div>
                      </div>
                      <div className={cn('text-xs font-medium', projectAccent.textClass)}>Ac</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Yeni bolum olustur</DialogTitle>
            <DialogDescription>
              Episode daha acilmadan anlatim tavrini ve render davranisini belirleyelim. Bu ayarlar yeni bolumun prompt kararlarini daha temiz baslatir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="episode-title">Bolum adi</Label>
              <Input
                id="episode-title"
                value={newEpisodeTitle}
                onChange={(e) => setNewEpisodeTitle(e.target.value)}
                placeholder="Bos birakirsan varsayilan Episode adi kullanilir"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Narrative mode</Label>
                <Select value={newEpisodeProjectType} onValueChange={(value: ProjectType) => setNewEpisodeProjectType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Narrative mode sec" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documentary">Belgesel</SelectItem>
                    <SelectItem value="commercial">Reklam / Ticari</SelectItem>
                    <SelectItem value="narrative">Kurgu Film / Dizi</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Sahne yorumu, tempo ve kamera tavrini etkiler.</p>
              </div>

              <div className="space-y-2">
                <Label>Render mode</Label>
                <Select value={newEpisodeRenderMode} onValueChange={(value: RenderMode) => setNewEpisodeRenderMode(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Render mode sec" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photoreal">{renderModeLabel('photoreal')}</SelectItem>
                    <SelectItem value="stylized">{renderModeLabel('stylized')}</SelectItem>
                    <SelectItem value="illustration">{renderModeLabel('illustration')}</SelectItem>
                    <SelectItem value="animation">{renderModeLabel('animation')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Goruntunun hangi medium gibi davranacagini sabitler.</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              Bu secim episode acildiginda otomatik yuklenir. Sonradan panel icinden degistirilebilir ama acilisi net kurmak iyi sonuc veriyor.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Vazgec
            </Button>
            <Button onClick={handleCreateEpisode} disabled={creating}>
              {creating ? 'Olusturuluyor...' : 'Bolumu ac'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

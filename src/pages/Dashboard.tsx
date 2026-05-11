import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  Plus,
  LogOut,
  Folder,
  Clock,
  Settings as SettingsIcon,
  Trash2,
  Pencil,
  Check,
  ExternalLink,
  Search,
  SortAsc,
  Layers3,
  Palette,
  Pin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BrandLockup } from '@/components/BrandMark';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { deleteProject, updateProject } from '@/lib/supabaseQueries';
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
import type { ProjectType } from '@/types';

interface Project {
  id: string;
  title: string;
  project_type: ProjectType;
  created_at: string;
  updated_at: string;
  episode_count?: number;
  last_episode_id?: string | null;
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

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKeyCount, setActiveKeyCount] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'updated_at' | 'title' | 'count'>('updated_at');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('documentary');
  const [projectPrefs, setProjectPrefs] = useState(() => readProjectUiPreferences());

  useEffect(() => {
    fetchProjects();
    fetchKeyCount();
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  async function fetchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          project_type,
          created_at,
          updated_at,
          episodes:episodes(count)
        `)
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectIds = (data || []).map((project) => project.id);

      const { data: latestEpisodes } = await supabase
        .from('episodes')
        .select('id, project_id')
        .in('project_id', projectIds.length > 0 ? projectIds : [''])
        .order('created_at', { ascending: false });

      const lastEpisodeMap = new Map<string, string>();
      (latestEpisodes || []).forEach((episode) => {
        if (!lastEpisodeMap.has(episode.project_id)) lastEpisodeMap.set(episode.project_id, episode.id);
      });

      setProjects(
        (data || []).map((project) => ({
          ...project,
          episode_count: project.episodes?.[0]?.count ?? 0,
          last_episode_id: lastEpisodeMap.get(project.id) ?? null,
        })),
      );
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKeyCount() {
    try {
      const { count, error } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (!error) setActiveKeyCount(count ?? 0);
    } catch {
      // ignore
    }
  }

  async function createNewProject() {
    setCreating(true);
    setCreateError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user?.id,
          title: `Yeni Proje ${new Date().toLocaleDateString('tr-TR')}`,
          project_type: newProjectType,
          style_guide: '',
          master_prompt: '',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) navigate(`/project/${data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setCreateError('Proje olusturulamadi. Lutfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setDeleteTargetId(null);
    }
  }

  function startRename(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(project.id);
    setEditValue(project.title);
  }

  async function handleRename(projectId: string) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    try {
      await updateProject(projectId, { title: trimmed });
      setProjects((prev) => prev.map((project) => (project.id === projectId ? { ...project, title: trimmed } : project)));
    } catch (error) {
      console.error('Error renaming project:', error);
    } finally {
      setEditingId(null);
    }
  }

  function handleRenameKeyDown(e: React.KeyboardEvent, projectId: string) {
    if (e.key === 'Enter') handleRename(projectId);
    if (e.key === 'Escape') setEditingId(null);
  }

  function toggleProjectPin(projectId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const current = getProjectUiPreference(projectId, projectPrefs);
    setProjectPrefs(updateProjectUiPreference(projectId, { isPinned: !current.isPinned }));
  }

  function setProjectAccent(projectId: string, accent: ProjectAccentId) {
    setProjectPrefs(updateProjectUiPreference(projectId, { accent }));
  }

  const filteredProjects = projects
    .filter((project) => project.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aPinned = getProjectUiPreference(a.id, projectPrefs).isPinned;
      const bPinned = getProjectUiPreference(b.id, projectPrefs).isPinned;
      if (aPinned !== bPinned) return bPinned ? 1 : -1;
      if (sortBy === 'updated_at') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'count') return (b.episode_count || 0) - (a.episode_count || 0);
      return 0;
    });
  const pinnedProjectCount = projects.filter((project) => getProjectUiPreference(project.id, projectPrefs).isPinned).length;

  const SkeletonProjectCard = () => (
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
          <BrandLockup titleClassName="text-xl" subtitle={user?.email || 'Production workspace'} />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cikis
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="border-b border-border/60 pb-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                <Layers3 className="h-3.5 w-3.5 text-primary" />
                Proje merkezi
              </div>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">Projeler</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Episode tabanli isleri tek yerden yonet. Proje ac, bolumlere ayril, prompt akisini episode bazinda takip et.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="outline">{projects.length} proje</Badge>
                <Badge variant="outline">{pinnedProjectCount} sabit</Badge>
                <Badge variant="outline">
                  {projects.reduce((sum, project) => sum + (project.episode_count || 0), 0)} toplam bolum
                </Badge>
                {activeKeyCount !== null ? (
                  <Badge
                    variant="outline"
                    className={activeKeyCount === 0 ? 'border-amber-500/30 text-amber-700 dark:text-amber-300' : 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300'}
                  >
                    {activeKeyCount === 0 ? 'API anahtari eksik' : `${activeKeyCount} aktif API anahtari`}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-5 shadow-sm">
              <div className="text-sm font-semibold">Yeni proje</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                Yeni proje acarken anlatim turunu basta sec. Episode olustururken bu cizgiyi daha da incelteceksin.
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Proje tipi</div>
                  <Select value={newProjectType} onValueChange={(value: ProjectType) => setNewProjectType(value)}>
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

                <Button onClick={createNewProject} disabled={creating} className="w-full">
                  {creating ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Yeni proje olustur
                    </>
                  )}
                </Button>

                {createError ? <div className="text-xs text-destructive">{createError}</div> : null}
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
                  placeholder="Proje ara..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={sortBy} onValueChange={(value: 'updated_at' | 'title' | 'count') => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SortAsc className="mr-2 h-4 w-4 opacity-50" />
                  <SelectValue placeholder="Sirala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Son guncellenen</SelectItem>
                  <SelectItem value="title">Isim A - Z</SelectItem>
                  <SelectItem value="count">Bolum sayisi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <SkeletonProjectCard key={item} />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="rounded-lg border-dashed border-border/70 px-8 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Folder className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold">Proje bulunamadi</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {searchTerm ? `"${searchTerm}" icin sonuc yok.` : 'Henuz proje yok. Yeni bir proje acip episode akisini kurabiliriz.'}
                </p>
                {!searchTerm ? (
                  <Button onClick={createNewProject} disabled={creating} className="mt-6">
                    <Plus className="mr-2 h-4 w-4" />
                    Ilk projeyi olustur
                  </Button>
                ) : null}
              </Card>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => {
                  const preference = getProjectUiPreference(project.id, projectPrefs);
                  const accent = getProjectAccent(preference.accent);

                  return (
                    <Card
                      key={project.id}
                      className={cn(
                        'group relative cursor-pointer overflow-hidden rounded-lg p-5 transition-colors',
                        accent.cardClass,
                        accent.cardHoverClass,
                      )}
                      onClick={() => editingId !== project.id && navigate(`/project/${project.id}`)}
                    >
                      <div className={cn('absolute inset-x-0 top-0 h-1', accent.topBarClass)} />
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-md border', accent.iconClass)}>
                          <Film className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-8 w-8 text-muted-foreground', preference.isPinned && accent.textClass)}
                            title={preference.isPinned ? 'Pini kaldir' : 'Basa pinle'}
                            onClick={(e) => toggleProjectPin(project.id, e)}
                          >
                            <Pin className={cn('h-4 w-4', preference.isPinned && 'fill-current')} />
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                title="Kart rengini degistir"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Palette className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" align="end" onClick={(e) => e.stopPropagation()}>
                              <div className="mb-3 text-xs font-medium text-muted-foreground">Kart rengi</div>
                              <div className="grid grid-cols-3 gap-2">
                                {PROJECT_ACCENTS.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={cn(
                                      'flex h-9 items-center justify-center rounded-md border border-border/70 bg-background transition-colors hover:border-foreground/40',
                                      preference.accent === option.id && 'border-foreground/60',
                                    )}
                                    onClick={() => setProjectAccent(project.id, option.id)}
                                    title={option.label}
                                  >
                                    <span className={cn('h-4 w-4 rounded-full', option.swatchClass)} />
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          {project.last_episode_id ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Son bolume git"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/project/${project.id}/episode/${project.last_episode_id}`);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {editingId !== project.id ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => startRename(project, e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(project.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-5">
                        {editingId === project.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={editInputRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, project.id)}
                              className="h-10"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleRename(project.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-2">
                              <h3 className="min-h-[3.25rem] flex-1 text-xl font-semibold leading-tight">{project.title}</h3>
                              {preference.isPinned ? (
                                <Badge variant="outline" className={accent.badgeClass}>
                                  Sabit
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">{projectTypeLabel(project.project_type)}</Badge>
                              <Badge variant="outline">{project.episode_count || 0} bolum</Badge>
                            </div>
                          </>
                        )}
                      </div>

                      <div className={cn('mt-8 flex items-end justify-between border-t pt-4', accent.dividerClass)}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(project.updated_at), 'd MMMM yyyy', { locale: tr })}
                          </div>
                          <div className="mt-2 text-sm font-medium text-foreground">
                            {project.last_episode_id ? 'Calismaya devam et' : 'Episode olusturmaya hazir'}
                          </div>
                        </div>
                        <div className={cn('text-xs font-medium', accent.textClass)}>Ac</div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu proje silinirse bagli bolumler ve sahneler de kalici olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Iptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTargetId && handleDeleteProject(deleteTargetId)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus, LogOut, Folder, Clock, Settings as SettingsIcon, Key, Trash2, Pencil, Check, X, ExternalLink, Search, SortAsc, LayoutGrid, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'updated_at' | 'title' | 'count'>('updated_at');
  const [projectType, setProjectType] = useState<ProjectType>('documentary');

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

      const projectIds = (data || []).map(p => p.id);

      // Fetch the most recent episode for each project in a single query
      const { data: latestEpisodes } = await supabase
        .from('episodes')
        .select('id, project_id')
        .in('project_id', projectIds.length > 0 ? projectIds : [''])
        .order('created_at', { ascending: false });

      // Build a map: project_id → most recent episode id
      const lastEpisodeMap = new Map<string, string>();
      (latestEpisodes || []).forEach(ep => {
        if (!lastEpisodeMap.has(ep.project_id)) {
          lastEpisodeMap.set(ep.project_id, ep.id);
        }
      });

      setProjects(
        (data || []).map(p => ({
          ...p,
          episode_count: p.episodes?.[0]?.count ?? 0,
          last_episode_id: lastEpisodeMap.get(p.id) ?? null,
        }))
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

      if (!error) {
        setActiveKeyCount(count ?? 0);
      }
    } catch {
      // Silently ignore
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
          project_type: projectType,
          style_guide: '',
          master_prompt: ''
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        navigate(`/project/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setCreateError('Proje oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
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
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: trimmed } : p));
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

  const filteredProjects = projects
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated_at') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'count') return (b.episode_count || 0) - (a.episode_count || 0);
      return 0;
    });

  const SkeletonProjectCard = () => (
    <Card className="p-6 border-primary/10 bg-card/40 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-7 w-3/4 mb-4" />
      <div className="flex justify-between items-center mt-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Film className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-serif font-semibold">Prompt Forge 4.1.0</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      {/* API Key Status Banner */}
      {activeKeyCount !== null && (
        <div className={`px-6 py-2 border-b text-sm ${
          activeKeyCount === 0
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {activeKeyCount === 0 ? (
              <span className="text-yellow-800 flex items-center gap-2">
                <Key className="h-4 w-4" />
                ⚠️ API anahtarı eklenmemiş. Ayarlar sayfasına gidin.
              </span>
            ) : (
              <span className="text-green-800 flex items-center gap-2">
                <Key className="h-4 w-4" />
                ✅ {activeKeyCount} aktif API anahtarı
              </span>
            )}
            {activeKeyCount === 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 h-7 text-xs"
                onClick={() => navigate('/settings')}
              >
                Ayarlara Git
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-serif font-bold tracking-tight">Projelerim</h2>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-sm">
                {projects.length}
              </span>
              aktif proje yönetiliyor
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-card/30 backdrop-blur-md p-2 rounded-xl border border-primary/5 shadow-2xl">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Proje ara..." 
                className="pl-9 bg-background/50 border-primary/10 focus:border-primary/30 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px] bg-background/50 border-primary/10">
                <SortAsc className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Son Güncelleme</SelectItem>
                <SelectItem value="title">İsim (A - Z)</SelectItem>
                <SelectItem value="count">Bölüm Sayısı</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectType} onValueChange={(value: ProjectType) => setProjectType(value)}>
              <SelectTrigger className="w-[220px] bg-background/50 border-primary/10">
                <SelectValue placeholder="Proje Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documentary">🎬 Belgesel</SelectItem>
                <SelectItem value="commercial">📺 Reklam / Ticari</SelectItem>
                <SelectItem value="narrative">🎭 Kurgu Film / Dizi</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={createNewProject} disabled={creating} className="shadow-lg shadow-primary/20">
              {creating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Yeni Proje
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonProjectCard key={i} />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-20 text-center bg-card/20 border-dashed border-2 border-primary/20 backdrop-blur-sm">
            <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="h-10 w-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-serif font-semibold mb-2">Proje bulunamadı</h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı.` : 'Henüz bir proje oluşturulmamış.'}
            </p>
            {!searchTerm && (
              <Button onClick={createNewProject} disabled={creating} size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-5 w-5" />
                {creating ? 'Oluşturuluyor...' : 'İlk Projeni Oluştur'}
              </Button>
            )}
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Aramayı Temizle
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <Card
                key={project.id}
                className="group relative overflow-hidden p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer border-primary/10 bg-card/60 backdrop-blur-md hover:-translate-y-1"
                onClick={() => editingId !== project.id && navigate(`/project/${project.id}`)}
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 p-8 -mr-8 -mt-8 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                <div className="flex items-start justify-between relative z-10 mb-6">
                  <div className="bg-primary/20 p-2.5 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner group-hover:rotate-6">
                    <Film className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Last episode quick link */}
                    {project.last_episode_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
                        title="Son bölüme git"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${project.id}/episode/${project.last_episode_id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Rename button */}
                    {editingId !== project.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
                        title="Yeniden adlandır"
                        onClick={(e) => startRename(project, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
                      title="Projeyi sil"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Inline rename or title */}
                {editingId === project.id ? (
                  <div className="flex items-center gap-2 mb-4 relative z-10" onClick={e => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      className="flex-1 text-xl font-serif font-bold bg-background/80 border-primary/30 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => handleRenameKeyDown(e, project.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-full"
                      onClick={() => handleRename(project.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative z-10 mb-6">
                    <h3
                      className="text-2xl font-serif font-bold group-hover:text-primary transition-colors leading-tight"
                      onDoubleClick={(e) => startRename(project, e)}
                    >
                      {project.title}
                    </h3>
                  </div>
                )}

                <div className="flex items-end justify-between relative z-10 pt-4 border-t border-primary/5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-primary/70">
                      {project.episode_count || 0} Bölüm
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <Clock className="h-3 w-3 opacity-50" />
                      {format(new Date(project.updated_at), 'd MMMM yyyy', { locale: tr })}
                    </div>
                  </div>
                  
                  <div className="h-10 w-10 rounded-full border border-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-primary/5 group-hover:scale-110 shadow-lg shadow-primary/5">
                    <ArrowLeft className="h-5 w-5 rotate-180 text-primary" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu projeyi silmek istediğinizden emin misiniz? Tüm bölümler ve sahneler kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
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

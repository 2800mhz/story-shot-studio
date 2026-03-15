import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus, LogOut, Folder, Clock, Settings as SettingsIcon, Key, Trash2, Pencil, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Project {
  id: string;
  title: string;
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Film className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-serif font-semibold">Story Shot Studio</h1>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Projelerim</h2>
            <p className="text-muted-foreground mt-1">
              {projects.length} {projects.length === 1 ? 'proje' : 'proje'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button onClick={createNewProject} size="lg" disabled={creating}>
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Yeni Proje
                </>
              )}
            </Button>
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-16 text-center">
            <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Henüz proje yok</h3>
            <p className="text-muted-foreground mb-6">
              Prompt üretmeye başlamak için ilk projenizi oluşturun
            </p>
            <Button onClick={createNewProject} disabled={creating}>
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Proje Oluştur
                </>
              )}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card
                key={project.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => editingId !== project.id && navigate(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <Film className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    {/* Last episode quick link */}
                    {project.last_episode_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        title="Son bölüme git"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${project.id}/episode/${project.last_episode_id}`);
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Rename button */}
                    {editingId !== project.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Yeniden adlandır"
                        onClick={(e) => startRename(project, e)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Projeyi sil"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(project.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Inline rename or title */}
                {editingId === project.id ? (
                  <div className="flex items-center gap-1 mb-2" onClick={e => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      className="flex-1 text-xl font-semibold bg-background border rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => handleRenameKeyDown(e, project.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600"
                      onClick={() => handleRename(project.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h3
                    className="text-xl font-semibold mb-2 line-clamp-1"
                    onDoubleClick={(e) => startRename(project, e)}
                    title="Yeniden adlandırmak için çift tıklayın"
                  >
                    {project.title}
                  </h3>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {project.episode_count || 0} bölüm
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(project.updated_at).toLocaleDateString('tr-TR')}
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

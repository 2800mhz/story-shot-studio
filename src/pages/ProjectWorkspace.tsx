import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Film, Trash2, FileText, Pencil, Search, SortAsc, Clock, Filter, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProject, fetchEpisodes, createEpisode, deleteEpisode, updateEpisode, updateProject } from '@/lib/supabaseQueries';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { ProjectType } from '@/types';

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
  
  // Active API State
  const [activeAPI, setActiveAPI] = useState<{provider: string, label: string} | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'newest' | 'oldest' | 'alphabetical'>('number');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [projectType, setProjectType] = useState<ProjectType>('documentary');

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
    } catch (err) {
      // Ignored
    }
  }

  async function loadData() {
    try {
      const [projectData, episodesData] = await Promise.all([
        fetchProject(projectId!),
        fetchEpisodes(projectId!)
      ]);
      setProject(projectData);
      setProjectType((projectData.project_type as ProjectType) || 'documentary');
      setEpisodes(episodesData);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEpisode() {
    if (!projectId) return;
    setCreating(true);
    try {
      const episode = await createEpisode(projectId, '');
      navigate(`/project/${projectId}/episode/${episode.id}`);
    } catch (error) {
      console.error('Error creating episode:', error);
      setCreating(false);
    }
  }

  async function handleDeleteEpisode(episodeId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this episode? This action cannot be undone.')) return;
    try {
      await deleteEpisode(episodeId);
      setEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
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
      setEpisodes(prev => prev.map(ep => ep.id === episodeId ? { ...ep, title: newTitle.trim() } : ep));
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
    setProject(prev => prev ? { ...prev, project_type: nextType } : prev);
    try {
      await updateProject(projectId, { project_type: nextType });
    } catch (error) {
      console.error('Error updating project type:', error);
      setProjectType(previous);
      setProject(prev => prev ? { ...prev, project_type: previous } : prev);
    }
  }

  const filteredEpisodes = episodes
    .filter(ep => {
      const matchesSearch = ep.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (dateFilter === 'all') return matchesSearch;
      
      const createdAt = new Date(ep.created_at);
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
    <Card className="p-6 border-primary/10 bg-card/40 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-7 w-full mb-3" />
      <Skeleton className="h-4 w-32" />
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <Film className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-serif font-semibold">
                  {project?.title || 'Loading...'}
                </h1>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="mt-2">
                  <Select value={projectType} onValueChange={(value: ProjectType) => handleProjectTypeChange(value)}>
                    <SelectTrigger className="w-[220px] h-8 bg-background/50 border-primary/10 text-xs">
                      <SelectValue placeholder="Proje Türü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="documentary">🎬 Belgesel</SelectItem>
                      <SelectItem value="commercial">📺 Reklam / Ticari</SelectItem>
                      <SelectItem value="narrative">🎭 Kurgu Film / Dizi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeAPI && (
              <Badge variant="outline" className="hidden md:flex items-center gap-1.5 py-1.5 px-3 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold shadow-sm animate-pulse-slow">
                <Zap className="h-3.5 w-3.5 fill-emerald-500" />
                {activeAPI.label || activeAPI.provider.toUpperCase()} ACTIVE
              </Badge>
            )}
            <Button onClick={handleCreateEpisode} disabled={creating} className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              {creating ? 'Oluşturuluyor...' : 'Yeni Bölüm'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-serif font-bold tracking-tight">Bölümler</h2>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-sm">
                {episodes.length}
              </span>
              toplam bölüm hazır
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-card/30 backdrop-blur-md p-2 rounded-xl border border-primary/5 shadow-2xl">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Bölüm ara..." 
                className="pl-9 bg-background/50 border-primary/10 focus:border-primary/30 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[160px] bg-background/50 border-primary/10">
                <SortAsc className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Bölüm No</SelectItem>
                <SelectItem value="newest">En Yeni</SelectItem>
                <SelectItem value="oldest">En Eski</SelectItem>
                <SelectItem value="alphabetical">A - Z</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
              <SelectTrigger className="w-[160px] bg-background/50 border-primary/10">
                <Filter className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Zaman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="week">Son 1 Hafta</SelectItem>
                <SelectItem value="month">Son 1 Ay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonEpisodeCard key={i} />)}
          </div>
        ) : filteredEpisodes.length === 0 ? (
          <Card className="p-20 text-center bg-card/20 border-dashed border-2 border-primary/20 backdrop-blur-sm">
            <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-primary/40" />
            </div>
            <h3 className="text-2xl font-serif font-semibold mb-2">Bölüm bulunamadı</h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı.` : 'Bu proje için henüz bir bölüm oluşturulmamış.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateEpisode} disabled={creating} size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-5 w-5" />
                {creating ? 'Oluşturuluyor...' : 'P İlk Bölümü Oluştur'}
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
            {filteredEpisodes.map(episode => (
              <Card
                key={episode.id}
                className="group relative overflow-hidden p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer border-primary/10 bg-card/60 backdrop-blur-md hover:-translate-y-1"
                onClick={() => navigate(`/project/${projectId}/episode/${episode.id}`)}
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 p-8 -mr-8 -mt-8 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex items-start justify-between relative z-10 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                      <FileText className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase border-primary/20 text-primary/70">
                      BÖLÜM {episode.episode_number}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(episode.id);
                        setEditValue(episode.title);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
                      onClick={(e) => handleDeleteEpisode(episode.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {editingId === episode.id ? (
                  <div className="relative z-10" onClick={e => e.stopPropagation()}>
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
                      className="text-lg font-bold bg-background/80 shadow-inner border-primary/30"
                    />
                  </div>
                ) : (
                  <div className="relative z-10 min-h-[3rem]">
                    <h3
                      className="text-xl font-serif font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors"
                    >
                      {episode.title}
                    </h3>
                  </div>
                )}
                
                <div className="mt-6 flex items-center justify-between relative z-10">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <Clock className="h-3 w-3 opacity-50" />
                      {format(new Date(episode.created_at), 'd MMMM yyyy', { locale: tr })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary/80">
                      <Film className="h-3.5 w-3.5" />
                      {episode.scene_count || 0} Sahne
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

    </div>
  );
}

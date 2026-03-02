import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Film, Trash2, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProject, fetchEpisodes, createEpisode, deleteEpisode, updateEpisode } from '@/lib/supabaseQueries';

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
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

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  async function loadData() {
    try {
      const [projectData, episodesData] = await Promise.all([
        fetchProject(projectId!),
        fetchEpisodes(projectId!)
      ]);
      setProject(projectData);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              </div>
            </div>
          </div>
          <Button onClick={handleCreateEpisode} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? 'Creating...' : 'New Episode'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Episodes</h2>
          <p className="text-muted-foreground mt-1">
            {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : episodes.length === 0 ? (
          <Card className="p-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No episodes yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first episode to start generating prompts
            </p>
            <Button onClick={handleCreateEpisode} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? 'Creating...' : 'Create Episode'}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {episodes.map(episode => (
              <Card
                key={episode.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/project/${projectId}/episode/${episode.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Episode {episode.episode_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                {editingId === episode.id ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleRenameEpisode(episode.id, editValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameEpisode(episode.id, editValue);
                      if (e.key === 'Escape') setEditingId(null);
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="text-lg font-semibold"
                  />
                ) : (
                  <h3
                    className="text-lg font-semibold line-clamp-2 cursor-pointer hover:text-primary"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingId(episode.id);
                      setEditValue(episode.title);
                    }}
                  >
                    {episode.title}
                  </h3>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(episode.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

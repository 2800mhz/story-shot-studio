import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus, LogOut, Folder, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  episode_count?: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

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

      setProjects(data?.map(p => ({
        ...p,
        episode_count: p.episodes?.[0]?.count || 0
      })) || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createNewProject() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user?.id,
          title: `Untitled Project ${new Date().toLocaleDateString()}`,
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
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Film className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-serif font-semibold">Prompt Forge</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">My Projects</h2>
            <p className="text-muted-foreground mt-1">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <Button onClick={createNewProject} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-16 text-center">
            <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to start generating prompts
            </p>
            <Button onClick={createNewProject}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card
                key={project.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <Film className="h-8 w-8 text-primary" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 line-clamp-1">
                  {project.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {project.episode_count || 0} {project.episode_count === 1 ? 'episode' : 'episodes'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

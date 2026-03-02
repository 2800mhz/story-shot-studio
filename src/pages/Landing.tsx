import React from 'react';
import { Film, Sparkles, Database, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-4xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <Film className="h-16 w-16 text-primary" />
            <h1 className="font-serif text-6xl font-bold text-white tracking-wide">
              Story Shot Studio
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl text-slate-300">
            AI-powered cinematic prompt generator for documentary filmmaking
          </p>

          {/* Description */}
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Transform your documentary scripts into stunning visual prompts. 
            Manage multiple projects, maintain character consistency, and generate 
            production-ready prompts for Midjourney, DALL-E, and Runway.
          </p>

          {/* CTA Button */}
          <div className="pt-8">
            <Button 
              size="lg" 
              onClick={signInWithGoogle}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            <div className="flex flex-col items-center space-y-3 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <Sparkles className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold text-white">AI-Powered Analysis</h3>
              <p className="text-sm text-slate-400 text-center">
                Smart scene complexity detection and production notes
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <Database className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold text-white">Multi-Project Management</h3>
              <p className="text-sm text-slate-400 text-center">
                Organize episodes, maintain global character & location libraries
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
              <Users className="h-12 w-12 text-primary" />
              <h3 className="text-xl font-semibold text-white">Consistent Output</h3>
              <p className="text-sm text-slate-400 text-center">
                Ensure visual consistency across all scenes and episodes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      })
      .catch((error) => {
        console.error('Error during auth callback:', error);
        navigate('/');
      });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

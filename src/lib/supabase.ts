import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
// Accept either VITE_SUPABASE_ANON_KEY (preferred) or VITE_SUPABASE_PUBLISHABLE_KEY (legacy)
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Database Types
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          style_guide: string | null
          master_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          style_guide?: string | null
          master_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          style_guide?: string | null
          master_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      episodes: {
        Row: {
          id: string
          project_id: string
          episode_number: number
          title: string
          document_text: string | null
          character_data: string | null
          location_data: string | null
          time_contexts: unknown
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          episode_number: number
          title: string
          document_text?: string | null
          character_data?: string | null
          location_data?: string | null
          time_contexts?: unknown
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          episode_number?: number
          title?: string
          document_text?: string | null
          character_data?: string | null
          location_data?: string | null
          time_contexts?: unknown
          created_at?: string
        }
      }
      global_characters: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          base_prompt: string | null
          first_appearance: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          base_prompt?: string | null
          first_appearance?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          base_prompt?: string | null
          first_appearance?: number | null
          created_at?: string
        }
      }
      global_locations: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          base_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          base_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          base_prompt?: string | null
          created_at?: string
        }
      }
      scenes: {
        Row: {
          id: string
          episode_id: string
          scene_number: number
          text: string
          visual_note: string | null
          character_ids: string[]
          location_ids: string[]
          analysis: unknown | null
          optimizations: string[]
          created_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          scene_number: number
          text: string
          visual_note?: string | null
          character_ids?: string[]
          location_ids?: string[]
          analysis?: unknown | null
          optimizations?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          scene_number?: number
          text?: string
          visual_note?: string | null
          character_ids?: string[]
          location_ids?: string[]
          analysis?: unknown | null
          optimizations?: string[]
          created_at?: string
        }
      }
      prompts: {
        Row: {
          id: string
          scene_id: string
          type: string | null
          label: string | null
          shot_type: string
          summary: string | null
          explanation: string | null
          prompt_text: string
          aspect_ratio: string
          created_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          type?: string | null
          label?: string | null
          shot_type: string
          summary?: string | null
          explanation?: string | null
          prompt_text: string
          aspect_ratio?: string
          created_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          type?: string | null
          label?: string | null
          shot_type?: string
          summary?: string | null
          explanation?: string | null
          prompt_text?: string
          aspect_ratio?: string
          created_at?: string
        }
      }
    }
  }
}

// Helper functions
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

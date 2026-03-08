// Unified Supabase client — re-exports from src/lib/supabase.ts so that all
// files importing from either path share the same singleton session.
export { supabase } from '@/lib/supabase';
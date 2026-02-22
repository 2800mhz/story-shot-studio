
-- Profiles table (auto-created on Google sign-in)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- User projects: stores the entire workspace state as JSONB
CREATE TABLE public.user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Varsayılan Proje',
  main_text TEXT DEFAULT '',
  text_5n1k TEXT DEFAULT '',
  main_file_name TEXT DEFAULT '',
  n1k_file_name TEXT DEFAULT '',
  episodes JSONB DEFAULT '[]'::jsonb,
  scenes JSONB DEFAULT '[]'::jsonb,
  consistency_groups JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON public.user_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.user_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.user_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.user_projects FOR DELETE USING (auth.uid() = user_id);

-- User settings: API keys, model config, system prompt
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  api_keys TEXT[] DEFAULT '{}',
  image_api_keys TEXT[] DEFAULT '{}',
  model TEXT DEFAULT 'gemini-2.5-flash',
  thinking_mode BOOLEAN DEFAULT false,
  variant_count INTEGER DEFAULT 3,
  temperature REAL DEFAULT 1.0,
  image_model TEXT DEFAULT 'gemini-2.0-flash-exp',
  system_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Motion prompt results
CREATE TABLE public.motion_prompt_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  thumbnail_url TEXT,
  prompt TEXT,
  note TEXT DEFAULT '',
  api_key_used TEXT DEFAULT '',
  model_used TEXT DEFAULT '',
  project_context TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.motion_prompt_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own motion results" ON public.motion_prompt_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own motion results" ON public.motion_prompt_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own motion results" ON public.motion_prompt_results FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_projects_updated_at BEFORE UPDATE ON public.user_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for motion prompt images
INSERT INTO storage.buckets (id, name, public) VALUES ('motion-images', 'motion-images', false);

CREATE POLICY "Users can upload own motion images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'motion-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own motion images" ON storage.objects FOR SELECT USING (bucket_id = 'motion-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own motion images" ON storage.objects FOR DELETE USING (bucket_id = 'motion-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==============================================================================
-- PHASE 16: 3D ACTION ENDLESS RUNNER - SUPABASE DATABASE SCHEMA & MIGRATION
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Runner',
  avatar_url TEXT,
  age INTEGER CHECK (age >= 10 AND age <= 120),
  country TEXT,
  bio TEXT,
  religion TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 15),
  highest_unlocked_level INTEGER NOT NULL DEFAULT 1 CHECK (highest_unlocked_level >= 1 AND highest_unlocked_level <= 15),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  total_distance NUMERIC NOT NULL DEFAULT 0 CHECK (total_distance >= 0),
  total_enemies_defeated INTEGER NOT NULL DEFAULT 0 CHECK (total_enemies_defeated >= 0),
  total_coins_collected INTEGER NOT NULL DEFAULT 0 CHECK (total_coins_collected >= 0),
  upgrade_levels JSONB NOT NULL DEFAULT '{"damage": 0, "health": 0, "bombs": 0, "shield": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Idempotent column additions for existing installations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 10 AND age <= 120);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_best_score ON public.profiles (best_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_highest_unlocked ON public.profiles (highest_unlocked_level DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.level_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL UNIQUE,
  level_id INTEGER NOT NULL CHECK (level_id >= 1 AND level_id <= 15),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  distance NUMERIC NOT NULL DEFAULT 0 CHECK (distance >= 0),
  duration_seconds NUMERIC NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0 AND duration_seconds <= 300),
  coins_collected INTEGER NOT NULL DEFAULT 0 CHECK (coins_collected >= 0),
  enemies_defeated INTEGER NOT NULL DEFAULT 0 CHECK (enemies_defeated >= 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_level_runs_user ON public.level_runs (user_id);
CREATE INDEX IF NOT EXISTS idx_level_runs_level ON public.level_runs (level_id);
CREATE INDEX IF NOT EXISTS idx_level_runs_created ON public.level_runs (created_at DESC);

ALTER TABLE public.level_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own level runs" ON public.level_runs;
DROP POLICY IF EXISTS "Users can insert their own level runs" ON public.level_runs;

CREATE POLICY "Users can view their own level runs"
  ON public.level_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level runs"
  ON public.level_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view conversations" ON public.chat_conversations;
CREATE POLICY "Members can view conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_members WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view membership" ON public.chat_members;
CREATE POLICY "Members can view membership"
  ON public.chat_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_members m WHERE m.conversation_id = chat_members.conversation_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can read conversation messages" ON public.chat_messages;
CREATE POLICY "Members can read conversation messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_members WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
CREATE POLICY "Members can send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.chat_members WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view and manage their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view and manage their own blocks"
  ON public.user_blocks FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can submit reports" ON public.user_reports;
CREATE POLICY "Users can submit reports"
  ON public.user_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Runner_' || SUBSTRING(NEW.id::text FROM 1 FOR 6)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_update ON public.profiles;
CREATE TRIGGER on_profiles_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

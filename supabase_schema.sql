-- ==============================================================================
-- PHASE 16: 3D ACTION ENDLESS RUNNER - SUPABASE DATABASE SCHEMA & MIGRATION
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It creates all required tables, Row Level Security (RLS) policies, indexes,
-- and automated triggers for profiles, level runs, presence, and chat foundation.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. PLAYER PROFILES TABLE
-- Stores authenticated player stats, highest unlocked levels, and upgrades.
-- ==============================================================================
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

-- Idempotent column additions for existing projects
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 10 AND age <= 120);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

-- Index for leaderboard queries and user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_best_score ON public.profiles (best_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_highest_unlocked ON public.profiles (highest_unlocked_level DESC);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- RLS: Authenticated players can read all profiles (required for lobby presence, leaderboards, and public runner cards)
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Players can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS: Players can update ONLY their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ==============================================================================
-- 3. LEVEL RUN HISTORY TABLE
-- Records completed and failed level runs with unique run_id to prevent duplicates.
-- ==============================================================================
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

-- Indexes for run lookups and history
CREATE INDEX IF NOT EXISTS idx_level_runs_user ON public.level_runs (user_id);
CREATE INDEX IF NOT EXISTS idx_level_runs_level ON public.level_runs (level_id);
CREATE INDEX IF NOT EXISTS idx_level_runs_created ON public.level_runs (created_at DESC);

-- Enable Row Level Security (RLS) on level_runs
ALTER TABLE public.level_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own level runs" ON public.level_runs;
DROP POLICY IF EXISTS "Users can insert their own level runs" ON public.level_runs;

-- RLS: Players can view only their own level runs
CREATE POLICY "Users can view their own level runs"
  ON public.level_runs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Players can insert their own level runs
CREATE POLICY "Users can insert their own level runs"
  ON public.level_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ==============================================================================
-- 4. FUTURE SOCIAL CHAT & SAFETY FOUNDATION (Section 13)
-- Schema and RLS policies for future player communications.
-- ==============================================================================
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

-- Chat RLS Policies: Members only
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


-- ==============================================================================
-- 5. AUTOMATED PROFILE INITIALIZATION TRIGGER
-- Automatically creates a default profile entry when a user signs up.
-- ==============================================================================
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

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp on profiles update
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

-- ==============================================================================
-- 8. MATCH PREFERENCES & DISCOVERY SETTINGS (PHASE 2)
-- Stores romantic discovery preferences for eligible adult players.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.match_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  seeking_preferences TEXT NOT NULL CHECK (seeking_preferences IN ('PRINCESS', 'PRINCE', 'ALL')),
  min_age INTEGER CHECK (min_age IS NULL OR (min_age >= 18 AND min_age <= 120)),
  max_age INTEGER CHECK (max_age IS NULL OR (max_age >= 18 AND max_age <= 120)),
  any_eligible_adult_age BOOLEAN NOT NULL DEFAULT false,
  religion_preference_type TEXT NOT NULL CHECK (religion_preference_type IN ('ANY', 'SAME', 'SPECIFIC', 'NO_PREFERENCE')),
  preferred_religions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  discovery_scope TEXT NOT NULL CHECK (discovery_scope IN ('GLOBAL', 'SAME_COUNTRY', 'SELECTED_COUNTRY', 'NEARBY')),
  selected_country_code TEXT,
  additional_preferences JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_age_range CHECK (
    any_eligible_adult_age = true OR 
    (min_age IS NOT NULL AND max_age IS NOT NULL AND min_age <= max_age)
  ),
  CONSTRAINT valid_country_for_scope CHECK (
    discovery_scope != 'SELECTED_COUNTRY' OR (selected_country_code IS NOT NULL AND length(trim(selected_country_code)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_match_preferences_user ON public.match_preferences (user_id);

ALTER TABLE public.match_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own preferences" ON public.match_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.match_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.match_preferences;

CREATE POLICY "Users can read their own preferences"
  ON public.match_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.match_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.match_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 9. PHASE 3: REAL PLAYER PROFILES & DISCOVERY FEED OPTIMIZATIONS
-- Indexes for efficient real player queries (adult discovery 18+)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_adult_discovery 
  ON public.profiles (age, updated_at DESC) 
  WHERE age >= 18;

CREATE INDEX IF NOT EXISTS idx_profiles_country_discovery 
  ON public.profiles (country, age) 
  WHERE age >= 18;

-- ==============================================================================
-- 10. PHASE 4: CHAT INVITATIONS, NOTIFICATIONS & LEVEL-GATED ACCESS
-- Table, indexes, constraints, and RLS policies for chat invitations.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
  cancelled_at TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT check_not_self_invitation CHECK (sender_id != recipient_id)
);

-- Unique index to prevent duplicate pending invitations in the same direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_invitations_unique_pending 
  ON public.chat_invitations (sender_id, recipient_id) 
  WHERE status = 'pending';

-- Query and lookup indexes
CREATE INDEX IF NOT EXISTS idx_chat_invitations_recipient_status 
  ON public.chat_invitations (recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_invitations_sender_status 
  ON public.chat_invitations (sender_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_invitations_created 
  ON public.chat_invitations (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.chat_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read invitations they sent or received" ON public.chat_invitations;
DROP POLICY IF EXISTS "Eligible users can send invitations" ON public.chat_invitations;
DROP POLICY IF EXISTS "Recipients can respond and update read status, senders can cancel" ON public.chat_invitations;

-- SELECT: Users can view invitations where they are sender or recipient
CREATE POLICY "Users can read invitations they sent or received"
  ON public.chat_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- INSERT: Authenticated sender can insert if not sending to self and neither user has blocked the other
CREATE POLICY "Eligible users can send invitations"
  ON public.chat_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() != recipient_id AND
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = recipient_id)
         OR (blocker_id = recipient_id AND blocked_id = auth.uid())
    )
  );

-- UPDATE: Recipient can accept/decline or mark as read; Sender can cancel pending
CREATE POLICY "Recipients can respond and update read status, senders can cancel"
  ON public.chat_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id)
  WITH CHECK (auth.uid() = recipient_id OR auth.uid() = sender_id);


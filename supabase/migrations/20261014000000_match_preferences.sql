-- ==============================================================================
-- PRINCE AND PRINCESS RESCUE — PHASE 2: MATCH PREFERENCES AND DISCOVERY SETTINGS
-- ==============================================================================
-- Creates the match_preferences table, checks, constraints, indexes, and RLS policies.
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

-- Unique index on user_id for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_match_preferences_user ON public.match_preferences (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.match_preferences ENABLE ROW LEVEL SECURITY;

-- Idempotently drop existing policies before re-creation
DROP POLICY IF EXISTS "Users can read their own preferences" ON public.match_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.match_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.match_preferences;

-- RLS: Authenticated players can read ONLY their own match preferences
CREATE POLICY "Users can read their own preferences"
  ON public.match_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Authenticated players can insert their own match preferences
CREATE POLICY "Users can insert their own preferences"
  ON public.match_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS: Authenticated players can update ONLY their own match preferences
CREATE POLICY "Users can update their own preferences"
  ON public.match_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

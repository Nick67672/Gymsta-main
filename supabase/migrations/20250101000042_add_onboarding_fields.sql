-- Migration: Add onboarding fields to profiles table
-- Generated on 2025-01-01

-- Add onboarding-related fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 13 AND age <= 120),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
ADD COLUMN IF NOT EXISTS primary_goal TEXT CHECK (primary_goal IN ('weight_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness', 'sports_performance', 'recovery')),
ADD COLUMN IF NOT EXISTS workout_frequency TEXT CHECK (workout_frequency IN ('1-2_times', '3-4_times', '5-6_times', 'daily')),
ADD COLUMN IF NOT EXISTS preferred_workout_duration TEXT CHECK (preferred_workout_duration IN ('15-30_min', '30-45_min', '45-60_min', '60+_min')),
ADD COLUMN IF NOT EXISTS experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- Create index for onboarding completion status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(has_completed_onboarding);

-- Update the existing profiles to mark them as having completed onboarding
-- (since they already have basic profile info)
UPDATE profiles 
SET has_completed_onboarding = TRUE 
WHERE username IS NOT NULL AND bio IS NOT NULL;

-- Create a function to check if user has completed onboarding
CREATE OR REPLACE FUNCTION has_completed_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  onboarding_completed BOOLEAN;
BEGIN
  SELECT has_completed_onboarding INTO onboarding_completed
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(onboarding_completed, FALSE);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION has_completed_onboarding(UUID) TO authenticated;

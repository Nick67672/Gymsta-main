-- Smart Rest Timer Enhancement Tables
-- This migration adds tables for personalized rest timer functionality

-- User rest preferences per exercise
CREATE TABLE IF NOT EXISTS user_rest_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  exercise_type text,
  preferred_rest_time integer NOT NULL DEFAULT 90,
  auto_start boolean DEFAULT true,
  adaptive_enabled boolean DEFAULT true,
  use_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, exercise_name)
);

-- Track actual vs suggested rest times for analytics
CREATE TABLE IF NOT EXISTS rest_time_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  exercise_type text,
  set_number integer,
  suggested_rest_time integer,
  actual_rest_time integer,
  was_skipped boolean DEFAULT false,
  was_extended boolean DEFAULT false,
  performance_after_rest integer, -- RPE 1-10 or similar metric
  workout_progress_percent numeric, -- How far through the workout (0-1)
  time_of_day time,
  created_at timestamp with time zone DEFAULT now()
);

-- Global user workout preferences
CREATE TABLE IF NOT EXISTS user_workout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_rest_time integer DEFAULT 90,
  adaptive_rest_enabled boolean DEFAULT true,
  auto_start_rest boolean DEFAULT true,
  rest_notifications_enabled boolean DEFAULT true,
  fatigue_adjustment_enabled boolean DEFAULT true,
  gesture_controls_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_rest_preferences_user_exercise ON user_rest_preferences(user_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_rest_analytics_user_exercise ON rest_time_analytics(user_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_rest_analytics_workout ON rest_time_analytics(workout_id);
CREATE INDEX IF NOT EXISTS idx_user_workout_preferences_user ON user_workout_preferences(user_id);

-- Enable RLS
ALTER TABLE user_rest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rest_time_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workout_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own rest preferences" ON user_rest_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own rest analytics" ON rest_time_analytics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workout preferences" ON user_workout_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to get optimal rest time for user and exercise
CREATE OR REPLACE FUNCTION get_optimal_rest_time(
  p_user_id uuid,
  p_exercise_name text,
  p_set_number integer DEFAULT 1,
  p_workout_progress numeric DEFAULT 0
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  base_time integer := 90;
  user_preference integer;
  avg_actual_time numeric;
  fatigue_multiplier numeric := 1.0;
  optimal_time integer;
BEGIN
  -- Get user's preferred time for this exercise
  SELECT preferred_rest_time INTO user_preference
  FROM user_rest_preferences
  WHERE user_id = p_user_id AND exercise_name = p_exercise_name;
  
  -- If no preference, use default
  IF user_preference IS NULL THEN
    SELECT default_rest_time INTO user_preference
    FROM user_workout_preferences
    WHERE user_id = p_user_id;
    
    IF user_preference IS NULL THEN
      user_preference := base_time;
    END IF;
  END IF;
  
  -- Calculate average actual rest time from analytics
  SELECT AVG(actual_rest_time) INTO avg_actual_time
  FROM rest_time_analytics
  WHERE user_id = p_user_id 
    AND exercise_name = p_exercise_name
    AND created_at > NOW() - INTERVAL '30 days'
    AND actual_rest_time > 0;
  
  -- Use analytics data if available, otherwise use preference
  base_time := COALESCE(ROUND(avg_actual_time), user_preference);
  
  -- Apply fatigue adjustment based on workout progress
  fatigue_multiplier := 1.0 + (p_workout_progress * 0.3);
  
  -- Apply set number adjustment (longer rest for later sets)
  fatigue_multiplier := fatigue_multiplier + ((p_set_number - 1) * 0.1);
  
  optimal_time := ROUND(base_time * fatigue_multiplier);
  
  -- Cap between 15 seconds and 5 minutes
  optimal_time := GREATEST(15, LEAST(300, optimal_time));
  
  RETURN optimal_time;
END;
$$;

-- Function to record rest time analytics
CREATE OR REPLACE FUNCTION record_rest_analytics(
  p_user_id uuid,
  p_workout_id uuid,
  p_exercise_name text,
  p_exercise_type text,
  p_set_number integer,
  p_suggested_time integer,
  p_actual_time integer,
  p_was_skipped boolean DEFAULT false,
  p_was_extended boolean DEFAULT false,
  p_performance_rating integer DEFAULT NULL,
  p_workout_progress numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO rest_time_analytics (
    user_id,
    workout_id,
    exercise_name,
    exercise_type,
    set_number,
    suggested_rest_time,
    actual_rest_time,
    was_skipped,
    was_extended,
    performance_after_rest,
    workout_progress_percent,
    time_of_day
  ) VALUES (
    p_user_id,
    p_workout_id,
    p_exercise_name,
    p_exercise_type,
    p_set_number,
    p_suggested_time,
    p_actual_time,
    p_was_skipped,
    p_was_extended,
    p_performance_rating,
    p_workout_progress,
    CURRENT_TIME
  );
  
  -- Update user preferences based on actual usage
  INSERT INTO user_rest_preferences (
    user_id,
    exercise_name,
    exercise_type,
    preferred_rest_time,
    use_count
  ) VALUES (
    p_user_id,
    p_exercise_name,
    p_exercise_type,
    p_actual_time,
    1
  )
  ON CONFLICT (user_id, exercise_name)
  DO UPDATE SET
    preferred_rest_time = ROUND((user_rest_preferences.preferred_rest_time * user_rest_preferences.use_count + p_actual_time) / (user_rest_preferences.use_count + 1)),
    use_count = user_rest_preferences.use_count + 1,
    updated_at = NOW();
END;
$$; 
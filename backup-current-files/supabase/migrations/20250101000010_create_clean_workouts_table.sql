-- =============================================
-- CLEAN WORKOUTS TABLE - FRESH START
-- This replaces all previous workout tables
-- =============================================

-- Drop existing workout tables if they exist (clean slate)
DROP TABLE IF EXISTS public.workout_exercises CASCADE;
DROP TABLE IF EXISTS public.workout_templates CASCADE;
DROP TABLE IF EXISTS public.exercise_history CASCADE;
DROP TABLE IF EXISTS public.workouts CASCADE;
DROP TABLE IF EXISTS public.planned_workouts CASCADE;

-- Remove any existing functions
DROP FUNCTION IF EXISTS public.update_exercise_history() CASCADE;
DROP FUNCTION IF EXISTS public.get_workout_volume_data(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_workout_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_exercise_structure() CASCADE;

-- Create clean workouts table
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Workout',
  date date NOT NULL DEFAULT CURRENT_DATE,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  is_completed boolean NOT NULL DEFAULT false,
  duration_minutes integer,
  total_volume numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX workouts_user_id_idx ON public.workouts(user_id);
CREATE INDEX workouts_date_idx ON public.workouts(date);
CREATE INDEX workouts_user_date_idx ON public.workouts(user_id, date);
CREATE INDEX workouts_created_at_idx ON public.workouts(created_at);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own workouts" ON public.workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts" ON public.workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON public.workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workouts_updated_at 
  BEFORE UPDATE ON public.workouts 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate total volume from exercises jsonb
CREATE OR REPLACE FUNCTION public.calculate_workout_volume(exercises_data jsonb)
RETURNS numeric AS $$
DECLARE
  total_volume numeric := 0;
  exercise jsonb;
  workout_set jsonb;
BEGIN
  FOR exercise IN SELECT * FROM jsonb_array_elements(exercises_data)
  LOOP
    FOR workout_set IN SELECT * FROM jsonb_array_elements(exercise->'sets')
    LOOP
      total_volume := total_volume + 
        COALESCE((workout_set->>'reps')::numeric, 0) * 
        COALESCE((workout_set->>'weight')::numeric, 0);
    END LOOP;
  END LOOP;
  
  RETURN total_volume;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate total volume when exercises are updated
CREATE OR REPLACE FUNCTION public.update_workout_volume()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_volume = public.calculate_workout_volume(NEW.exercises);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_workout_volume_trigger
  BEFORE INSERT OR UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workout_volume();

-- Function to get workout analytics
CREATE OR REPLACE FUNCTION public.get_workout_analytics(
  p_user_id uuid,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  workout_date date,
  total_volume numeric,
  exercise_count integer,
  workout_duration integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.date as workout_date,
    w.total_volume,
    jsonb_array_length(w.exercises) as exercise_count,
    w.duration_minutes as workout_duration
  FROM public.workouts w
  WHERE w.user_id = p_user_id
    AND w.is_completed = true
    AND w.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
  ORDER BY w.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.workouts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_analytics TO authenticated;

-- Create planned_workouts table for workout planning (separate from completed workouts)
CREATE TABLE IF NOT EXISTS public.planned_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Planned Workout',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX planned_workouts_user_id_idx ON public.planned_workouts(user_id);
CREATE INDEX planned_workouts_date_idx ON public.planned_workouts(date);
CREATE INDEX planned_workouts_user_date_idx ON public.planned_workouts(user_id, date);

-- Enable RLS
ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own planned workouts" ON public.planned_workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planned workouts" ON public.planned_workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned workouts" ON public.planned_workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned workouts" ON public.planned_workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_planned_workouts
  BEFORE UPDATE ON public.planned_workouts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Clean workouts table created successfully!';
  RAISE NOTICE '📊 Features: RLS policies, auto volume calculation, analytics';
  RAISE NOTICE '🎯 Ready for workout tracking!';
END $$; 
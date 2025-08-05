-- Add workout time tracking columns
-- This migration adds start_time and end_time columns to track when workouts actually started and ended

-- Add start_time and end_time columns to workouts table
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- Add indexes for time-based queries
CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON public.workouts(start_time);
CREATE INDEX IF NOT EXISTS idx_workouts_end_time ON public.workouts(end_time);
CREATE INDEX IF NOT EXISTS idx_workouts_user_start_time ON public.workouts(user_id, start_time);

-- Add a computed column for actual duration (in minutes) based on start and end times
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER 
GENERATED ALWAYS AS (
  CASE 
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ELSE duration_minutes
  END
) STORED;

-- Add comment to explain the duration logic
COMMENT ON COLUMN public.workouts.actual_duration_minutes IS 
'Duration in minutes. If start_time and end_time are available, calculates actual duration. Otherwise uses manually entered duration_minutes.';

-- Update existing workouts to have start_time if they don't have it
-- (use created_at as a fallback for existing workouts)
UPDATE public.workouts 
SET start_time = created_at 
WHERE start_time IS NULL AND is_completed = true;

-- Update existing workouts to have end_time if they don't have it
-- (use created_at + duration_minutes as a fallback for existing workouts)
UPDATE public.workouts 
SET end_time = created_at + (duration_minutes || 0) * INTERVAL '1 minute'
WHERE end_time IS NULL AND is_completed = true AND duration_minutes IS NOT NULL; 
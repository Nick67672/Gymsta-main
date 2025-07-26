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
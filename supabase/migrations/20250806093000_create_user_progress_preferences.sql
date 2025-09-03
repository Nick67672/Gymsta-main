-- User progress preferences: which tiles/metrics to show on the workout hub
CREATE TABLE IF NOT EXISTS public.user_progress_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["weekly_sessions","total_volume_7d","body_weight_avg_7d"]
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["Bench Press","Squat"]
  updated_at timestamptz DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS user_progress_preferences_user_id_idx ON public.user_progress_preferences(user_id);

-- Enable RLS and policies
ALTER TABLE public.user_progress_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own_prefs_select" ON public.user_progress_preferences
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "own_prefs_insert" ON public.user_progress_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "own_prefs_update" ON public.user_progress_preferences
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Upsert helper function (optional convenience)
CREATE OR REPLACE FUNCTION public.upsert_user_progress_preferences(
  p_user_id uuid,
  p_metrics jsonb,
  p_exercises jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.user_progress_preferences(user_id, metrics, exercises)
  VALUES (p_user_id, p_metrics, p_exercises)
  ON CONFLICT (user_id)
  DO UPDATE SET metrics = EXCLUDED.metrics, exercises = EXCLUDED.exercises, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_user_progress_preferences(uuid, jsonb, jsonb) TO authenticated;



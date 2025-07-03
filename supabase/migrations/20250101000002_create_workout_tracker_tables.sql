-- Create workout tracker tables
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_completed boolean DEFAULT false,
  name text,
  notes text,
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Exercises within workouts
CREATE TABLE workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer NOT NULL DEFAULT 1,
  reps integer NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 0,
  volume numeric GENERATED ALWAYS AS (sets * reps * weight) STORED,
  notes text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Workout templates for reuse
CREATE TABLE workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  exercises jsonb NOT NULL,
  tags text[],
  created_at timestamp with time zone DEFAULT now()
);

-- Exercise history for autocomplete suggestions
CREATE TABLE exercise_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  last_used timestamp with time zone DEFAULT now(),
  use_count integer DEFAULT 1,
  UNIQUE(user_id, exercise_name)
);

-- RLS Policies
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_history ENABLE ROW LEVEL SECURITY;

-- Workouts policies
CREATE POLICY "Users can view their own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Workout exercises policies
CREATE POLICY "Users can view their own workout exercises" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts 
      WHERE workouts.id = workout_exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own workout exercises" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts 
      WHERE workouts.id = workout_exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own workout exercises" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workouts 
      WHERE workouts.id = workout_exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own workout exercises" ON workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workouts 
      WHERE workouts.id = workout_exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );

-- Workout templates policies
CREATE POLICY "Users can view their own workout templates" ON workout_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout templates" ON workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout templates" ON workout_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout templates" ON workout_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Exercise history policies
CREATE POLICY "Users can view their own exercise history" ON exercise_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise history" ON exercise_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise history" ON exercise_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise history" ON exercise_history
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_exercise_history_user_id ON exercise_history(user_id);
CREATE INDEX idx_exercise_history_name ON exercise_history(user_id, exercise_name);

-- Function to update exercise history when exercises are added
CREATE OR REPLACE FUNCTION update_exercise_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO exercise_history (user_id, exercise_name, last_used, use_count)
  SELECT w.user_id, NEW.name, now(), 1
  FROM workouts w
  WHERE w.id = NEW.workout_id
  ON CONFLICT (user_id, exercise_name)
  DO UPDATE SET
    last_used = now(),
    use_count = exercise_history.use_count + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update exercise history
CREATE TRIGGER trigger_update_exercise_history
  AFTER INSERT ON workout_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_history();

-- Function to get workout volume data for charts
CREATE OR REPLACE FUNCTION get_workout_volume_data(
  p_user_id uuid,
  p_exercise_name text DEFAULT NULL,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  workout_date date,
  exercise_name text,
  total_volume numeric,
  total_sets integer,
  total_reps integer,
  max_weight numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.date as workout_date,
    we.name as exercise_name,
    SUM(we.volume) as total_volume,
    SUM(we.sets) as total_sets,
    SUM(we.reps) as total_reps,
    MAX(we.weight) as max_weight
  FROM workouts w
  JOIN workout_exercises we ON w.id = we.workout_id
  WHERE w.user_id = p_user_id
    AND w.is_completed = true
    AND w.date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    AND (p_exercise_name IS NULL OR we.name ILIKE p_exercise_name)
  GROUP BY w.date, we.name
  ORDER BY w.date ASC;
END;
$$ LANGUAGE plpgsql; 
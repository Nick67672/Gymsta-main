-- =============================================
-- WORKOUT TRACKER COMPLETE SETUP
-- Safe to run multiple times
-- =============================================

-- Create workouts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workouts') THEN
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
        
        -- Create indexes for workouts
        CREATE INDEX idx_workouts_user_id ON workouts(user_id);
        CREATE INDEX idx_workouts_date ON workouts(date);
        CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
        
        RAISE NOTICE 'Created workouts table';
    ELSE
        RAISE NOTICE 'Workouts table already exists';
    END IF;
END $$;

-- Create workout_exercises table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workout_exercises') THEN
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
        
        -- Create indexes for workout_exercises
        CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
        CREATE INDEX idx_workout_exercises_name ON workout_exercises(name);
        
        RAISE NOTICE 'Created workout_exercises table';
    ELSE
        RAISE NOTICE 'Workout_exercises table already exists';
    END IF;
END $$;

-- Create workout_templates table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workout_templates') THEN
        CREATE TABLE workout_templates (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            name text NOT NULL,
            exercises jsonb NOT NULL,
            tags text[],
            created_at timestamp with time zone DEFAULT now()
        );
        
        -- Create indexes for workout_templates
        CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
        
        RAISE NOTICE 'Created workout_templates table';
    ELSE
        RAISE NOTICE 'Workout_templates table already exists';
    END IF;
END $$;

-- Create exercise_history table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercise_history') THEN
        CREATE TABLE exercise_history (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            exercise_name text NOT NULL,
            last_used timestamp with time zone DEFAULT now(),
            use_count integer DEFAULT 1,
            UNIQUE(user_id, exercise_name)
        );
        
        -- Create indexes for exercise_history
        CREATE INDEX idx_exercise_history_user_id ON exercise_history(user_id);
        CREATE INDEX idx_exercise_history_name ON exercise_history(exercise_name);
        CREATE INDEX idx_exercise_history_use_count ON exercise_history(use_count DESC);
        
        RAISE NOTICE 'Created exercise_history table';
    ELSE
        RAISE NOTICE 'Exercise_history table already exists';
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- Workouts policies
    DROP POLICY IF EXISTS "Users can view their own workouts" ON workouts;
    DROP POLICY IF EXISTS "Users can insert their own workouts" ON workouts;
    DROP POLICY IF EXISTS "Users can update their own workouts" ON workouts;
    DROP POLICY IF EXISTS "Users can delete their own workouts" ON workouts;
    
    CREATE POLICY "Users can view their own workouts" ON workouts
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own workouts" ON workouts
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own workouts" ON workouts
        FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own workouts" ON workouts
        FOR DELETE USING (auth.uid() = user_id);
    
    -- Workout exercises policies
    DROP POLICY IF EXISTS "Users can view their own workout exercises" ON workout_exercises;
    DROP POLICY IF EXISTS "Users can insert their own workout exercises" ON workout_exercises;
    DROP POLICY IF EXISTS "Users can update their own workout exercises" ON workout_exercises;
    DROP POLICY IF EXISTS "Users can delete their own workout exercises" ON workout_exercises;
    
    CREATE POLICY "Users can view their own workout exercises" ON workout_exercises
        FOR SELECT USING (auth.uid() = (SELECT user_id FROM workouts WHERE id = workout_id));
    CREATE POLICY "Users can insert their own workout exercises" ON workout_exercises
        FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM workouts WHERE id = workout_id));
    CREATE POLICY "Users can update their own workout exercises" ON workout_exercises
        FOR UPDATE USING (auth.uid() = (SELECT user_id FROM workouts WHERE id = workout_id));
    CREATE POLICY "Users can delete their own workout exercises" ON workout_exercises
        FOR DELETE USING (auth.uid() = (SELECT user_id FROM workouts WHERE id = workout_id));
    
    -- Workout templates policies
    DROP POLICY IF EXISTS "Users can view their own workout templates" ON workout_templates;
    DROP POLICY IF EXISTS "Users can insert their own workout templates" ON workout_templates;
    DROP POLICY IF EXISTS "Users can update their own workout templates" ON workout_templates;
    DROP POLICY IF EXISTS "Users can delete their own workout templates" ON workout_templates;
    
    CREATE POLICY "Users can view their own workout templates" ON workout_templates
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own workout templates" ON workout_templates
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own workout templates" ON workout_templates
        FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own workout templates" ON workout_templates
        FOR DELETE USING (auth.uid() = user_id);
    
    -- Exercise history policies
    DROP POLICY IF EXISTS "Users can view their own exercise history" ON exercise_history;
    DROP POLICY IF EXISTS "Users can insert their own exercise history" ON exercise_history;
    DROP POLICY IF EXISTS "Users can update their own exercise history" ON exercise_history;
    DROP POLICY IF EXISTS "Users can delete their own exercise history" ON exercise_history;
    
    CREATE POLICY "Users can view their own exercise history" ON exercise_history
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own exercise history" ON exercise_history
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own exercise history" ON exercise_history
        FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own exercise history" ON exercise_history
        FOR DELETE USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Created all RLS policies';
END $$;

-- Create trigger function for exercise history
CREATE OR REPLACE FUNCTION update_exercise_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO exercise_history (user_id, exercise_name, last_used, use_count)
    VALUES (
        (SELECT user_id FROM workouts WHERE id = NEW.workout_id),
        NEW.name,
        now(),
        1
    )
    ON CONFLICT (user_id, exercise_name)
    DO UPDATE SET
        last_used = now(),
        use_count = exercise_history.use_count + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for exercise history
DROP TRIGGER IF EXISTS trigger_update_exercise_history ON workout_exercises;
CREATE TRIGGER trigger_update_exercise_history
    AFTER INSERT ON workout_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_exercise_history();

-- Create function for workout volume analytics
DROP FUNCTION IF EXISTS get_workout_volume_data(uuid, text, integer);
DROP FUNCTION IF EXISTS get_workout_volume_data(uuid, text);
DROP FUNCTION IF EXISTS get_workout_volume_data;

CREATE OR REPLACE FUNCTION get_workout_volume_data(
    p_user_id uuid,
    p_exercise_name text,
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
        AND we.name = p_exercise_name
        AND w.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
        AND w.is_completed = true
    GROUP BY w.date, we.name
    ORDER BY w.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for workout statistics
CREATE OR REPLACE FUNCTION get_workout_stats(p_user_id uuid)
RETURNS TABLE (
    total_workouts bigint,
    total_volume numeric,
    avg_duration interval,
    total_exercises bigint,
    most_used_exercise text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT w.id) as total_workouts,
        COALESCE(SUM(we.volume), 0) as total_volume,
        INTERVAL '0' as avg_duration, -- Placeholder for future duration tracking
        COUNT(we.id) as total_exercises,
        (
            SELECT we2.name 
            FROM workout_exercises we2
            JOIN workouts w2 ON we2.workout_id = w2.id
            WHERE w2.user_id = p_user_id
            GROUP BY we2.name
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) as most_used_exercise
    FROM workouts w
    LEFT JOIN workout_exercises we ON w.id = we.workout_id
    WHERE w.user_id = p_user_id AND w.is_completed = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Workout Tracker setup completed successfully!';
    RAISE NOTICE 'Tables created: workouts, workout_exercises, workout_templates, exercise_history';
    RAISE NOTICE 'Functions created: get_workout_volume_data, get_workout_stats';
    RAISE NOTICE 'RLS policies and triggers configured';
END $$; 
-- Quick fix for the function parameter error
-- Copy and paste this into Supabase SQL Editor

-- Drop all versions of the existing function
DROP FUNCTION IF EXISTS get_workout_volume_data(uuid, text, integer);
DROP FUNCTION IF EXISTS get_workout_volume_data(uuid, text);
DROP FUNCTION IF EXISTS get_workout_volume_data;

-- Create the correct function
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

-- Success message
SELECT 'Function fixed successfully!' as message; 
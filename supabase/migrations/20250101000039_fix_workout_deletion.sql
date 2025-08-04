-- Fix Workout Deletion System
-- This migration ensures complete workout deletion with proper cleanup of related data

-- Create a comprehensive function to delete workouts and all related data
CREATE OR REPLACE FUNCTION delete_workout_completely(workout_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete related data that references the workout by post_id
  -- (Since the system treats workouts as posts in some contexts)
  DELETE FROM likes WHERE post_id = workout_id;
  DELETE FROM comments WHERE post_id = workout_id;
  
  -- Delete workout-specific shares
  DELETE FROM content_shares WHERE workout_id = workout_id;
  
  -- Delete any chat messages that reference this workout
  UPDATE a_chat_messages SET workout_id = NULL WHERE workout_id = workout_id;
  
  -- Delete any rest timer analytics for this workout
  DELETE FROM rest_time_analytics WHERE workout_id = workout_id;
  
  -- Finally, delete the workout itself
  -- This will cascade to any workout_exercises if they exist
  DELETE FROM workouts WHERE id = workout_id;
END;
$$ LANGUAGE plpgsql;

-- Create a secure RPC function that users can call to delete their own workouts
CREATE OR REPLACE FUNCTION public.delete_my_workout(workout_id UUID)
RETURNS void AS $$
DECLARE
  workout_user_id UUID;
BEGIN
  -- Get the workout's user_id to ensure ownership
  SELECT user_id INTO workout_user_id 
  FROM workouts 
  WHERE id = workout_id;
  
  -- Check if workout exists and user owns it
  IF workout_user_id IS NULL THEN
    RAISE EXCEPTION 'Workout not found';
  END IF;
  
  IF workout_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own workouts';
  END IF;
  
  -- Call the comprehensive deletion function
  PERFORM delete_workout_completely(workout_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_my_workout(UUID) TO authenticated;

-- Update the existing workout deletion policy to ensure it works properly
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;
CREATE POLICY "Users can delete their own workouts" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure that related tables have proper cascade deletion for workout cleanup
-- Add missing foreign key constraints if they don't exist

-- For content_shares table - ensure proper cleanup
DO $$ 
BEGIN
    -- Check if the constraint exists and add it if not
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'content_shares_workout_id_fkey'
        AND table_name = 'content_shares'
    ) THEN
        ALTER TABLE content_shares 
        ADD CONSTRAINT content_shares_workout_id_fkey 
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For rest_time_analytics table - ensure proper cleanup
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rest_time_analytics'
    ) THEN
        -- Check if the constraint exists and add it if not
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'rest_time_analytics_workout_id_fkey'
            AND table_name = 'rest_time_analytics'
        ) THEN
            ALTER TABLE rest_time_analytics 
            ADD CONSTRAINT rest_time_analytics_workout_id_fkey 
            FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create a trigger to automatically clean up workout-related data when a workout is deleted
CREATE OR REPLACE FUNCTION cleanup_workout_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up likes that reference this workout by post_id
  DELETE FROM likes WHERE post_id = OLD.id;
  
  -- Clean up comments that reference this workout by post_id
  DELETE FROM comments WHERE post_id = OLD.id;
  
  -- Clean up content shares
  DELETE FROM content_shares WHERE workout_id = OLD.id;
  
  -- Set workout_id to NULL in chat messages (don't delete the messages)
  UPDATE a_chat_messages SET workout_id = NULL WHERE workout_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_cleanup_workout_data ON workouts;
CREATE TRIGGER trigger_cleanup_workout_data
  BEFORE DELETE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_workout_data();

-- Add comment to document the fix
COMMENT ON FUNCTION delete_workout_completely(UUID) IS 'Completely deletes a workout and all related data including likes, comments, and shares';
COMMENT ON FUNCTION public.delete_my_workout(UUID) IS 'Secure function for users to delete their own workouts with complete cleanup';
COMMENT ON TRIGGER trigger_cleanup_workout_data ON workouts IS 'Automatically cleans up workout-related data when a workout is deleted';
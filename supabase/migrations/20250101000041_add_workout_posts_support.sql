-- Add workout posts support to posts table
-- This migration adds workout_id and post_type columns to support workout posts

-- Add workout_id column to posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'workout_id'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add post_type column to posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'post_type'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN post_type TEXT DEFAULT 'regular' CHECK (post_type IN ('regular', 'workout', 'achievement'));
    END IF;
END $$;

-- Create index for workout posts
CREATE INDEX IF NOT EXISTS idx_posts_workout_id ON posts(workout_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);

-- Update RLS policies to allow workout posts
-- Users can view posts that are public or their own, including workout posts
DROP POLICY IF EXISTS "Users can view posts" ON posts;
CREATE POLICY "Users can view posts" ON posts
  FOR SELECT USING (
    is_public = true 
    OR auth.uid() = user_id
    OR auth.uid() IN (
      SELECT follower_id FROM follows 
      WHERE following_id = posts.user_id AND status = 'accepted'
    )
  );

-- Users can insert their own posts, including workout posts
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id); 
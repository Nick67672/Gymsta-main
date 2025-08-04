-- Enhanced Sharing System Migration
-- This migration adds support for sharing both posts and workouts with comprehensive tracking

-- 1. Create content_shares table for unified sharing tracking
CREATE TABLE IF NOT EXISTS content_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  sharer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN (
    'direct_message', 
    'external_share', 
    'external_link',
    'copy_link', 
    'social_media',
    'email',
    'instagram',
    'story_repost'
  )),
  share_medium text CHECK (share_medium IN (
    'chat', 
    'instagram', 
    'twitter', 
    'facebook', 
    'whatsapp', 
    'telegram', 
    'email', 
    'copy',
    'native_share',
    'clipboard'
  )),
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure either post_id or workout_id is provided, but not both
  CONSTRAINT content_type_check CHECK (
    (post_id IS NOT NULL AND workout_id IS NULL) OR 
    (post_id IS NULL AND workout_id IS NOT NULL)
  )
);

-- 2. Add workout_id column to a_chat_messages if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'workout_id'
    ) THEN
        ALTER TABLE a_chat_messages 
        ADD COLUMN workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Update message_type enum to include workout sharing
DO $$ 
BEGIN
    -- Add new message types if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'message_type_enum'
    ) THEN
        CREATE TYPE message_type_enum AS ENUM (
            'text', 
            'image', 
            'video', 
            'post_share', 
            'workout_share',
            'location',
            'file'
        );
    END IF;
END $$;

-- 4. Add share_count columns to both posts and workouts tables
DO $$ 
BEGIN
    -- Add share_count to posts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;

    -- Add share_count to workouts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE workouts 
        ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. Create function to update share counts
CREATE OR REPLACE FUNCTION update_content_share_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update post share count
    IF NEW.post_id IS NOT NULL THEN
        UPDATE posts 
        SET share_count = (
            SELECT COUNT(*) 
            FROM content_shares 
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;
    END IF;

    -- Update workout share count
    IF NEW.workout_id IS NOT NULL THEN
        UPDATE workouts 
        SET share_count = (
            SELECT COUNT(*) 
            FROM content_shares 
            WHERE workout_id = NEW.workout_id
        )
        WHERE id = NEW.workout_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update share counts
DROP TRIGGER IF EXISTS update_content_share_count_trigger ON content_shares;
CREATE TRIGGER update_content_share_count_trigger
    AFTER INSERT OR DELETE ON content_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_content_share_count();

-- 7. Create function to get comprehensive sharing statistics
CREATE OR REPLACE FUNCTION get_content_share_stats(content_id uuid, content_type text)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'totalShares', COALESCE(share_counts.total, 0),
        'byPlatform', share_platforms.platforms,
        'byType', share_types.types,
        'recentShares', recent_shares.shares
    ) INTO result
    FROM (
        SELECT COUNT(*) as total
        FROM content_shares 
        WHERE 
            (content_type = 'post' AND post_id = content_id) OR
            (content_type = 'workout' AND workout_id = content_id)
    ) share_counts,
    (
        SELECT json_object_agg(share_medium, count) as platforms
        FROM (
            SELECT 
                share_medium,
                COUNT(*) as count
            FROM content_shares 
            WHERE 
                (content_type = 'post' AND post_id = content_id) OR
                (content_type = 'workout' AND workout_id = content_id)
            GROUP BY share_medium
        ) platform_counts
    ) share_platforms,
    (
        SELECT json_object_agg(share_type, count) as types
        FROM (
            SELECT 
                share_type,
                COUNT(*) as count
            FROM content_shares 
            WHERE 
                (content_type = 'post' AND post_id = content_id) OR
                (content_type = 'workout' AND workout_id = content_id)
            GROUP BY share_type
        ) type_counts
    ) share_types,
    (
        SELECT json_agg(
            json_build_object(
                'id', cs.id,
                'sharer_id', cs.sharer_id,
                'share_type', cs.share_type,
                'share_medium', cs.share_medium,
                'created_at', cs.created_at,
                'sharer_username', p.username,
                'sharer_avatar', p.avatar_url
            )
        ) as shares
        FROM (
            SELECT *
            FROM content_shares 
            WHERE 
                (content_type = 'post' AND post_id = content_id) OR
                (content_type = 'workout' AND workout_id = content_id)
            ORDER BY created_at DESC
            LIMIT 10
        ) cs
        LEFT JOIN profiles p ON cs.sharer_id = p.id
    ) recent_shares;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Enable RLS on content_shares
ALTER TABLE content_shares ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for content_shares
-- Policy for users to view their own shares
CREATE POLICY "Users can view their own shares" ON content_shares
    FOR SELECT USING (sharer_id = auth.uid());

-- Policy for users to view shares of content they own
CREATE POLICY "Users can view shares of their content" ON content_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM workouts WHERE id = workout_id AND user_id = auth.uid()
        )
    );

-- Policy for users to create shares
CREATE POLICY "Users can create shares" ON content_shares
    FOR INSERT WITH CHECK (sharer_id = auth.uid());

-- Policy for users to update their own shares
CREATE POLICY "Users can update their own shares" ON content_shares
    FOR UPDATE USING (sharer_id = auth.uid());

-- Policy for users to delete their own shares
CREATE POLICY "Users can delete their own shares" ON content_shares
    FOR DELETE USING (sharer_id = auth.uid());

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_shares_post_id ON content_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_workout_id ON content_shares(workout_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_sharer_id ON content_shares(sharer_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_recipient_id ON content_shares(recipient_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_created_at ON content_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_shares_type_medium ON content_shares(share_type, share_medium);

-- 11. Create indexes for chat messages with workout support
CREATE INDEX IF NOT EXISTS idx_chat_messages_workout_id ON a_chat_messages(workout_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON a_chat_messages(message_type);

-- 12. Update existing post_shares to content_shares (if post_shares table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_shares') THEN
        -- Migrate existing post shares to content_shares with proper type mapping
        INSERT INTO content_shares (
            post_id, 
            sharer_id, 
            recipient_id, 
            share_type, 
            share_medium, 
            message, 
            created_at
        )
        SELECT 
            post_id,
            sharer_id,
            recipient_id,
            CASE 
                WHEN share_type = 'external_link' THEN 'external_share'
                ELSE share_type
            END as share_type,
            share_medium,
            message,
            created_at
        FROM post_shares
        ON CONFLICT DO NOTHING;
        
        -- Drop the old table
        DROP TABLE IF EXISTS post_shares;
    END IF;
END $$;

-- 13. Create function to get shareable content info
CREATE OR REPLACE FUNCTION get_shareable_content_info(content_id uuid, content_type text)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    IF content_type = 'post' THEN
        SELECT json_build_object(
            'id', p.id,
            'type', 'post',
            'title', p.caption,
            'description', p.caption,
            'imageUrl', p.image_url,
            'authorUsername', prof.username,
            'authorId', p.user_id,
            'url', 'https://gymsta.app/post/' || p.id,
            'metadata', json_build_object(
                'likes', COALESCE(p.like_count, 0),
                'comments', COALESCE(p.comment_count, 0)
            )
        ) INTO result
        FROM posts p
        LEFT JOIN profiles prof ON p.user_id = prof.id
        WHERE p.id = content_id;
    ELSIF content_type = 'workout' THEN
        SELECT json_build_object(
            'id', w.id,
            'type', 'workout',
            'title', COALESCE(w.name, 'Workout'),
            'description', COALESCE(w.notes, 'Check out this workout!'),
            'authorUsername', prof.username,
            'authorId', w.user_id,
            'url', 'https://gymsta.app/workout/' || w.id,
            'metadata', json_build_object(
                'exerciseCount', (
                    SELECT COUNT(DISTINCT we.exercise_name) 
                    FROM workout_exercises we 
                    WHERE we.workout_id = w.id
                ),
                'totalSets', (
                    SELECT COUNT(*) 
                    FROM workout_exercises we 
                    WHERE we.workout_id = w.id
                ),
                'totalVolume', (
                    SELECT COALESCE(SUM(we.volume), 0)
                    FROM workout_exercises we 
                    WHERE we.workout_id = w.id
                )
            )
        ) INTO result
        FROM workouts w
        LEFT JOIN profiles prof ON w.user_id = prof.id
        WHERE w.id = content_id;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql; 
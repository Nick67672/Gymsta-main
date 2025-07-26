-- Comprehensive fix for messaging and sharing functionality
-- This migration ensures all required tables, columns, and policies exist

-- 1. Ensure all required columns exist in a_chat_messages
DO $$ 
BEGIN
    -- Add post_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'post_id'
    ) THEN
        ALTER TABLE a_chat_messages 
        ADD COLUMN post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
    END IF;

    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE a_chat_messages 
        ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
    END IF;

    -- Add share_count column to posts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create post_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sharer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN ('direct_message', 'external_link', 'copy_link', 'story_repost')),
  share_medium text CHECK (share_medium IN ('chat', 'instagram', 'twitter', 'facebook', 'whatsapp', 'telegram', 'email', 'copy')),
  message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Create chat_message_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES a_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, reaction)
);

-- 4. Enable RLS on all tables
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view shares of their own posts" ON post_shares;
DROP POLICY IF EXISTS "Users can create shares" ON post_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON post_shares;
DROP POLICY IF EXISTS "Users can send chat messages and shared posts" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages and shared posts" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON chat_message_reactions;

-- 6. Create comprehensive policies for post_shares
CREATE POLICY "Users can view shares of their own posts"
  ON post_shares
  FOR SELECT
  USING (
    sharer_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create shares"
  ON post_shares
  FOR INSERT
  WITH CHECK (auth.uid() = sharer_id);

CREATE POLICY "Users can delete their own shares"
  ON post_shares
  FOR DELETE
  USING (auth.uid() = sharer_id);

-- 7. Create comprehensive policies for chat messages with post sharing
CREATE POLICY "Users can send chat messages and shared posts"
ON a_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  chat_id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view chat messages and shared posts"
ON a_chat_messages
FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);

-- 8. Create policies for chat message reactions
CREATE POLICY "Users can view reactions"
ON chat_message_reactions
FOR SELECT
TO authenticated
USING (
  message_id IN (
    SELECT id FROM a_chat_messages
    WHERE chat_id IN (
      SELECT chat_id FROM a_chat_users
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage their own reactions"
ON chat_message_reactions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 9. Create or replace function to get post share stats
CREATE OR REPLACE FUNCTION get_post_share_stats(post_uuid uuid)
RETURNS TABLE (
  total_shares bigint,
  direct_message_shares bigint,
  external_shares bigint,
  story_reposts bigint,
  unique_sharers bigint,
  recent_sharers jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0)::bigint as total_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type = 'direct_message'), 0)::bigint as direct_message_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type IN ('external_link', 'copy_link')), 0)::bigint as external_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type = 'story_repost'), 0)::bigint as story_reposts,
    COALESCE(COUNT(DISTINCT sharer_id), 0)::bigint as unique_sharers,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'username', p.username,
          'avatar_url', p.avatar_url,
          'shared_at', ps.created_at
        ) ORDER BY ps.created_at DESC
      ) FILTER (WHERE p.username IS NOT NULL),
      '[]'::jsonb
    ) as recent_sharers
  FROM post_shares ps
  LEFT JOIN profiles p ON ps.sharer_id = p.id
  WHERE ps.post_id = post_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to update share count on posts
CREATE OR REPLACE FUNCTION update_post_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET share_count = COALESCE(share_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET share_count = GREATEST(COALESCE(share_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger to automatically update share count
DROP TRIGGER IF EXISTS update_post_share_count_trigger ON post_shares;
CREATE TRIGGER update_post_share_count_trigger
  AFTER INSERT OR DELETE ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_post_share_count();

-- 12. Update existing posts to have correct share counts
UPDATE posts 
SET share_count = COALESCE((
  SELECT COUNT(*) 
  FROM post_shares 
  WHERE post_shares.post_id = posts.id
), 0)
WHERE share_count IS NULL;

-- 13. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_sharer_id ON post_shares(sharer_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_recipient_id ON post_shares(recipient_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_created_at ON post_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_post_id ON a_chat_messages(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON a_chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_id ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user_id ON chat_message_reactions(user_id);

-- 14. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON post_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_message_reactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_share_stats(uuid) TO authenticated; 
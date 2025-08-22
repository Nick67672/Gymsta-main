-- Fix Share Post Feature Migration
-- This migration consolidates and fixes all sharing-related functionality

-- 1. Ensure a_chat_messages has all required columns for sharing
DO $$ 
BEGIN
    -- Add post_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'post_id'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
    END IF;

    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;

    -- Add user_id column if it doesn't exist (some systems use sender_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure posts table has share_count column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE posts ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Drop conflicting tables and recreate post_shares properly
DROP TABLE IF EXISTS content_shares CASCADE;

-- Create a clean post_shares table
CREATE TABLE IF NOT EXISTS post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sharer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  share_type text NOT NULL,
  share_medium text,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure valid share types
  CONSTRAINT post_shares_share_type_check 
  CHECK (share_type IN (
    'direct_message', 
    'external_link', 
    'copy_link', 
    'story_repost',
    'social_media'
  ))
);

-- 4. Enable RLS on post_shares
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies and recreate them cleanly
DROP POLICY IF EXISTS "Users can view shares of their own posts" ON post_shares;
DROP POLICY IF EXISTS "Users can create shares" ON post_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON post_shares;
DROP POLICY IF EXISTS "post_shares_select_policy" ON post_shares;
DROP POLICY IF EXISTS "post_shares_insert_policy" ON post_shares;

-- Create clean policies for post_shares
CREATE POLICY "Users can view shares of their own posts"
  ON post_shares
  FOR SELECT
  USING (
    sharer_id = auth.uid() OR 
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares"
  ON post_shares
  FOR INSERT
  WITH CHECK (sharer_id = auth.uid());

CREATE POLICY "Users can delete their own shares"
  ON post_shares
  FOR DELETE
  USING (sharer_id = auth.uid());

-- 6. Drop all existing policies for a_chat_messages and recreate them
DROP POLICY IF EXISTS "Users can send chat messages and shared posts" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages and shared posts" ON a_chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_policy" ON a_chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON a_chat_messages;

-- Create clean policies for a_chat_messages
CREATE POLICY "Users can send chat messages and shared posts"
  ON a_chat_messages
  FOR INSERT
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
  USING (
    chat_id IN (
      SELECT chat_id
      FROM a_chat_users
      WHERE user_id = auth.uid()
    )
  );

-- 7. Create or replace the get_post_share_stats function
CREATE OR REPLACE FUNCTION get_post_share_stats(post_uuid uuid)
RETURNS TABLE (
  total_shares bigint,
  direct_message_shares bigint,
  external_shares bigint,
  story_reposts bigint,
  unique_sharers bigint,
  recent_sharers jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0)::bigint as total_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type = 'direct_message'), 0)::bigint as direct_message_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type IN ('external_link', 'copy_link', 'social_media')), 0)::bigint as external_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type = 'story_repost'), 0)::bigint as story_reposts,
    COALESCE(COUNT(DISTINCT sharer_id), 0)::bigint as unique_sharers,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ps.sharer_id,
          'username', p.username,
          'avatar_url', p.avatar_url,
          'shared_at', ps.created_at
        ) ORDER BY ps.created_at DESC
      ) FILTER (WHERE ps.sharer_id IS NOT NULL),
      '[]'::jsonb
    ) as recent_sharers
  FROM post_shares ps
  LEFT JOIN profiles p ON ps.sharer_id = p.id
  WHERE ps.post_id = post_uuid;
END;
$$;

-- 8. Create function to update post share count
CREATE OR REPLACE FUNCTION update_post_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET share_count = COALESCE(share_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET share_count = GREATEST(COALESCE(share_count, 0) - 1, 0) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically update share counts
DROP TRIGGER IF EXISTS update_post_share_count_trigger ON post_shares;
CREATE TRIGGER update_post_share_count_trigger
  AFTER INSERT OR DELETE ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_post_share_count();

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_sharer_id ON post_shares(sharer_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_recipient_id ON post_shares(recipient_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_created_at ON post_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_post_id ON a_chat_messages(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON a_chat_messages(message_type);

-- 11. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON post_shares TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_share_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_post_share_count() TO authenticated;

-- 12. Update existing posts to have share_count if they don't
UPDATE posts SET share_count = 0 WHERE share_count IS NULL;

-- 13. Create a function to safely share posts to chat
CREATE OR REPLACE FUNCTION share_post_to_chat(
  p_post_id uuid,
  p_recipient_id uuid,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_id uuid;
  v_message_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Find existing chat or create new one
  SELECT chat_id INTO v_chat_id
  FROM a_chat_users
  WHERE user_id = v_current_user_id
  AND chat_id IN (
    SELECT chat_id 
    FROM a_chat_users 
    WHERE user_id = p_recipient_id
  )
  LIMIT 1;
  
  -- Create new chat if none exists
  IF v_chat_id IS NULL THEN
    INSERT INTO a_chat (last_message, last_message_at)
    VALUES ('Shared a post.', now())
    RETURNING id INTO v_chat_id;
    
    -- Add both users to the chat
    INSERT INTO a_chat_users (chat_id, user_id) VALUES
      (v_chat_id, v_current_user_id),
      (v_chat_id, p_recipient_id);
  END IF;
  
  -- Insert the shared post message
  INSERT INTO a_chat_messages (chat_id, user_id, message_type, post_id, message)
  VALUES (v_chat_id, v_current_user_id, 'post', p_post_id, COALESCE(p_message, ' '))
  RETURNING id INTO v_message_id;
  
  -- Update chat last message
  UPDATE a_chat 
  SET last_message = 'Shared a post.', last_message_at = now()
  WHERE id = v_chat_id;
  
  -- Track the share
  INSERT INTO post_shares (post_id, sharer_id, recipient_id, share_type, share_medium, message)
  VALUES (p_post_id, v_current_user_id, p_recipient_id, 'direct_message', 'chat', p_message);
  
  RETURN v_chat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION share_post_to_chat(uuid, uuid, text) TO authenticated;

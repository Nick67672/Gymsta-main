-- Minimal migration to fix messaging and sharing
-- This focuses only on essential changes to avoid conflicts

-- 1. Add essential columns to a_chat_messages (only if they don't exist)
DO $$ 
BEGIN
    -- Add post_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'post_id'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN post_id UUID;
    END IF;

    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;

    -- Add share_count column to posts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE posts ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create post_shares table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  sharer_id uuid NOT NULL,
  recipient_id uuid,
  share_type text NOT NULL,
  share_medium text,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Enable RLS on post_shares (safe operation)
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies for post_shares (drop first to avoid conflicts)
DROP POLICY IF EXISTS "post_shares_select_policy" ON post_shares;
DROP POLICY IF EXISTS "post_shares_insert_policy" ON post_shares;

CREATE POLICY "post_shares_select_policy"
  ON post_shares
  FOR SELECT
  TO authenticated
  USING (
    sharer_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

CREATE POLICY "post_shares_insert_policy"
  ON post_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sharer_id);

-- 5. Create basic policies for a_chat_messages (drop first to avoid conflicts)
DROP POLICY IF EXISTS "chat_messages_select_policy" ON a_chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON a_chat_messages;

CREATE POLICY "chat_messages_select_policy"
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

CREATE POLICY "chat_messages_insert_policy"
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

-- 6. Create a simple function to get share stats
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
    COALESCE(COUNT(*) FILTER (WHERE share_type IN ('external_link', 'copy_link')), 0)::bigint as external_shares,
    COALESCE(COUNT(*) FILTER (WHERE share_type = 'story_repost'), 0)::bigint as story_reposts,
    COALESCE(COUNT(DISTINCT sharer_id), 0)::bigint as unique_sharers,
    '[]'::jsonb as recent_sharers
  FROM post_shares ps
  WHERE ps.post_id = post_uuid;
END;
$$; 
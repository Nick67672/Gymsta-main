-- Manual Database Setup for Messaging and Sharing
-- Run this directly in your Supabase SQL Editor

-- 1. Ensure required columns exist (safe operations)
DO $$ 
BEGIN
    -- Add post_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'post_id'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN post_id UUID;
        RAISE NOTICE 'Added post_id column to a_chat_messages';
    ELSE
        RAISE NOTICE 'post_id column already exists in a_chat_messages';
    END IF;

    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a_chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE a_chat_messages ADD COLUMN message_type TEXT DEFAULT 'text';
        RAISE NOTICE 'Added message_type column to a_chat_messages';
    ELSE
        RAISE NOTICE 'message_type column already exists in a_chat_messages';
    END IF;

    -- Add share_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE posts ADD COLUMN share_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added share_count column to posts';
    ELSE
        RAISE NOTICE 'share_count column already exists in posts';
    END IF;
END $$;

-- 2. Create post_shares table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'post_shares'
    ) THEN
        CREATE TABLE post_shares (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id uuid NOT NULL,
          sharer_id uuid NOT NULL,
          recipient_id uuid,
          share_type text NOT NULL,
          share_medium text,
          message text,
          created_at timestamptz DEFAULT now() NOT NULL
        );
        
        ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Created post_shares table';
    ELSE
        RAISE NOTICE 'post_shares table already exists';
    END IF;
END $$;

-- 3. Fix RLS policies for a_chat_messages
DO $$
BEGIN
    -- Drop existing policies that might conflict
    DROP POLICY IF EXISTS "Users can send chat messages and shared posts" ON a_chat_messages;
    DROP POLICY IF EXISTS "Users can view chat messages and shared posts" ON a_chat_messages;
    DROP POLICY IF EXISTS "Users can send chat messages" ON a_chat_messages;
    DROP POLICY IF EXISTS "Users can view chat messages" ON a_chat_messages;
    DROP POLICY IF EXISTS "chat_messages_select_policy" ON a_chat_messages;
    DROP POLICY IF EXISTS "chat_messages_insert_policy" ON a_chat_messages;
    
    -- Create new policies
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
    
    RAISE NOTICE 'Updated a_chat_messages RLS policies';
END $$;

-- 4. Fix RLS policies for post_shares
DO $$
BEGIN
    -- Drop existing policies that might conflict
    DROP POLICY IF EXISTS "Users can view shares of their own posts" ON post_shares;
    DROP POLICY IF EXISTS "Users can create shares" ON post_shares;
    DROP POLICY IF EXISTS "Users can delete their own shares" ON post_shares;
    DROP POLICY IF EXISTS "post_shares_select_policy" ON post_shares;
    DROP POLICY IF EXISTS "post_shares_insert_policy" ON post_shares;
    
    -- Create new policies
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
    
    RAISE NOTICE 'Updated post_shares RLS policies';
END $$;

-- 5. Ensure the get_post_share_stats function exists and works
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

-- 6. Test the setup
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Test the function
    SELECT * INTO test_result FROM get_post_share_stats('00000000-0000-0000-0000-000000000000'::uuid);
    RAISE NOTICE 'Function test successful - total_shares: %', test_result.total_shares;
    
    -- Test table access
    PERFORM COUNT(*) FROM post_shares LIMIT 1;
    RAISE NOTICE 'post_shares table access successful';
    
    PERFORM COUNT(*) FROM a_chat_messages LIMIT 1;
    RAISE NOTICE 'a_chat_messages table access successful';
    
    RAISE NOTICE 'All tests passed! Database setup is complete.';
END $$; 
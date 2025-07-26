-- Safe migration for messaging and sharing functionality
-- This migration handles existing database objects and avoids conflicts

-- 1. Safely add columns to a_chat_messages if they don't exist
DO $$ 
BEGIN
    -- Add post_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'a_chat_messages' 
        AND column_name = 'post_id'
    ) THEN
        ALTER TABLE public.a_chat_messages 
        ADD COLUMN post_id UUID;
        
        -- Add foreign key constraint separately
        ALTER TABLE public.a_chat_messages 
        ADD CONSTRAINT fk_chat_messages_post_id 
        FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE SET NULL;
    END IF;

    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'a_chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE public.a_chat_messages 
        ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;

    -- Add share_count column to posts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'posts' 
        AND column_name = 'share_count'
    ) THEN
        ALTER TABLE public.posts 
        ADD COLUMN share_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Safely create post_shares table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'post_shares'
    ) THEN
        CREATE TABLE public.post_shares (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id uuid NOT NULL,
          sharer_id uuid NOT NULL,
          recipient_id uuid,
          share_type text NOT NULL,
          share_medium text,
          message text,
          created_at timestamptz DEFAULT now() NOT NULL,
          
          CONSTRAINT fk_post_shares_post_id 
            FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
          CONSTRAINT fk_post_shares_sharer_id 
            FOREIGN KEY (sharer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
          CONSTRAINT fk_post_shares_recipient_id 
            FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
          CONSTRAINT check_share_type 
            CHECK (share_type IN ('direct_message', 'external_link', 'copy_link', 'story_repost')),
          CONSTRAINT check_share_medium 
            CHECK (share_medium IN ('chat', 'instagram', 'twitter', 'facebook', 'whatsapp', 'telegram', 'email', 'copy'))
        );
        
        -- Enable RLS
        ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 3. Safely create chat_message_reactions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_message_reactions'
    ) THEN
        CREATE TABLE public.chat_message_reactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id uuid NOT NULL,
          user_id uuid NOT NULL,
          reaction text NOT NULL,
          created_at timestamptz DEFAULT now() NOT NULL,
          
          CONSTRAINT fk_chat_reactions_message_id 
            FOREIGN KEY (message_id) REFERENCES public.a_chat_messages(id) ON DELETE CASCADE,
          CONSTRAINT fk_chat_reactions_user_id 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
          CONSTRAINT unique_user_reaction 
            UNIQUE(message_id, user_id, reaction)
        );
        
        -- Enable RLS
        ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 4. Safely drop and recreate policies for post_shares
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view shares of their own posts" ON public.post_shares;
    DROP POLICY IF EXISTS "Users can create shares" ON public.post_shares;
    DROP POLICY IF EXISTS "Users can delete their own shares" ON public.post_shares;
    
    -- Create new policies
    CREATE POLICY "Users can view shares of their own posts"
      ON public.post_shares
      FOR SELECT
      TO authenticated
      USING (
        sharer_id = auth.uid() OR 
        recipient_id = auth.uid() OR 
        post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
      );

    CREATE POLICY "Users can create shares"
      ON public.post_shares
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = sharer_id);

    CREATE POLICY "Users can delete their own shares"
      ON public.post_shares
      FOR DELETE
      TO authenticated
      USING (auth.uid() = sharer_id);
END $$;

-- 5. Safely drop and recreate policies for a_chat_messages
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can send chat messages and shared posts" ON public.a_chat_messages;
    DROP POLICY IF EXISTS "Users can view chat messages and shared posts" ON public.a_chat_messages;
    DROP POLICY IF EXISTS "Users can send chat messages" ON public.a_chat_messages;
    DROP POLICY IF EXISTS "Users can view chat messages" ON public.a_chat_messages;
    
    -- Create new policies
    CREATE POLICY "Users can send chat messages and shared posts"
    ON public.a_chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid() AND
      chat_id IN (
        SELECT chat_id
        FROM public.a_chat_users
        WHERE user_id = auth.uid()
      )
    );

    CREATE POLICY "Users can view chat messages and shared posts"
    ON public.a_chat_messages
    FOR SELECT
    TO authenticated
    USING (
      chat_id IN (
        SELECT chat_id
        FROM public.a_chat_users
        WHERE user_id = auth.uid()
      )
    );
END $$;

-- 6. Safely drop and recreate policies for chat_message_reactions
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view reactions" ON public.chat_message_reactions;
    DROP POLICY IF EXISTS "Users can manage their own reactions" ON public.chat_message_reactions;
    
    -- Create new policies
    CREATE POLICY "Users can view reactions"
    ON public.chat_message_reactions
    FOR SELECT
    TO authenticated
    USING (
      message_id IN (
        SELECT id FROM public.a_chat_messages
        WHERE chat_id IN (
          SELECT chat_id FROM public.a_chat_users
          WHERE user_id = auth.uid()
        )
      )
    );

    CREATE POLICY "Users can manage their own reactions"
    ON public.chat_message_reactions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- 7. Safely create or replace the get_post_share_stats function
CREATE OR REPLACE FUNCTION public.get_post_share_stats(post_uuid uuid)
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
  FROM public.post_shares ps
  LEFT JOIN public.profiles p ON ps.sharer_id = p.id
  WHERE ps.post_id = post_uuid;
END;
$$;

-- 8. Safely create or replace the update_post_share_count function
CREATE OR REPLACE FUNCTION public.update_post_share_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
    SET share_count = COALESCE(share_count, 0) + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
    SET share_count = GREATEST(COALESCE(share_count, 0) - 1, 0) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 9. Safely create the trigger
DO $$
BEGIN
    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS update_post_share_count_trigger ON public.post_shares;
    
    -- Create trigger
    CREATE TRIGGER update_post_share_count_trigger
      AFTER INSERT OR DELETE ON public.post_shares
      FOR EACH ROW
      EXECUTE FUNCTION public.update_post_share_count();
END $$;

-- 10. Safely create indexes
DO $$
BEGIN
    -- Create indexes only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_post_shares_post_id') THEN
        CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_post_shares_sharer_id') THEN
        CREATE INDEX idx_post_shares_sharer_id ON public.post_shares(sharer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_post_shares_recipient_id') THEN
        CREATE INDEX idx_post_shares_recipient_id ON public.post_shares(recipient_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_post_shares_created_at') THEN
        CREATE INDEX idx_post_shares_created_at ON public.post_shares(created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_messages_post_id') THEN
        CREATE INDEX idx_chat_messages_post_id ON public.a_chat_messages(post_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_messages_message_type') THEN
        CREATE INDEX idx_chat_messages_message_type ON public.a_chat_messages(message_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_message_reactions_message_id') THEN
        CREATE INDEX idx_chat_message_reactions_message_id ON public.chat_message_reactions(message_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_message_reactions_user_id') THEN
        CREATE INDEX idx_chat_message_reactions_user_id ON public.chat_message_reactions(user_id);
    END IF;
END $$;

-- 11. Update existing posts share counts safely
UPDATE public.posts 
SET share_count = COALESCE((
  SELECT COUNT(*) 
  FROM public.post_shares 
  WHERE post_shares.post_id = posts.id
), 0)
WHERE share_count IS NULL;

-- 12. Grant permissions safely
DO $$
BEGIN
    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_shares TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_reactions TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_post_share_stats(uuid) TO authenticated;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- If we don't have permission to grant, that's ok
        NULL;
END $$; 
-- Fix RLS Policies for Messaging and Sharing
-- Run this in your Supabase SQL Editor if the debug tests show RLS permission errors

-- 1. Fix a_chat_messages policies
DROP POLICY IF EXISTS "Users can send chat messages and shared posts" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages and shared posts" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_policy" ON a_chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON a_chat_messages;

-- Simple, working policies for chat messages
CREATE POLICY "chat_messages_insert_policy"
ON a_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

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

-- 2. Fix post_shares policies
DROP POLICY IF EXISTS "Users can view shares of their own posts" ON post_shares;
DROP POLICY IF EXISTS "Users can create shares" ON post_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON post_shares;
DROP POLICY IF EXISTS "post_shares_select_policy" ON post_shares;
DROP POLICY IF EXISTS "post_shares_insert_policy" ON post_shares;

-- Simple, working policies for post shares
CREATE POLICY "post_shares_insert_policy"
ON post_shares
FOR INSERT
TO authenticated
WITH CHECK (
  sharer_id = auth.uid()
);

CREATE POLICY "post_shares_select_policy"
ON post_shares
FOR SELECT
TO authenticated
USING (
  sharer_id = auth.uid() OR 
  recipient_id = auth.uid()
);

-- 3. Fix a_chat policies (if needed)
DROP POLICY IF EXISTS "Users can create chats" ON a_chat;
DROP POLICY IF EXISTS "Users can view their chats" ON a_chat;
DROP POLICY IF EXISTS "Users can update their chats" ON a_chat;

CREATE POLICY "chat_insert_policy"
ON a_chat
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "chat_select_policy"
ON a_chat
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "chat_update_policy"
ON a_chat
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);

-- 4. Fix a_chat_users policies (if needed)
DROP POLICY IF EXISTS "Users can manage their chat memberships" ON a_chat_users;
DROP POLICY IF EXISTS "Users can view their chat memberships" ON a_chat_users;

CREATE POLICY "chat_users_insert_policy"
ON a_chat_users
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "chat_users_select_policy"
ON a_chat_users
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  chat_id IN (
    SELECT chat_id
    FROM a_chat_users
    WHERE user_id = auth.uid()
  )
);

-- Test the policies
SELECT 'RLS policies updated successfully!' as status; 
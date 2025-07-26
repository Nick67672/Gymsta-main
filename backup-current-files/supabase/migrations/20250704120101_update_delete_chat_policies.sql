-- Allow participants to fully delete a chat by enabling deletion of
-- 1) Any messages in chats they participate in
-- 2) Their corresponding chat_user rows
-- 3) The chat row itself once messages are gone
--
-- This migration is idempotent and can be safely re-run.

-- Enable RLS (no-op if already enabled)
ALTER TABLE IF EXISTS a_chat_users ENABLE ROW LEVEL SECURITY;

-- Clean up old policies if they exist
DROP POLICY IF EXISTS "Users can delete chat users in their chats" ON a_chat_users;
DROP POLICY IF EXISTS "Users can delete any messages in their chats" ON a_chat_messages;

-- 1) Participants can delete ANY message in chats they belong to
CREATE POLICY "Users can delete any messages in their chats"
ON a_chat_messages
FOR DELETE
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id FROM a_chat_users WHERE user_id = auth.uid()
  )
);

-- 2) Participants can delete the a_chat_users row for their chat (needed before removing the chat itself)
CREATE POLICY "Users can delete chat users in their chats"
ON a_chat_users
FOR DELETE
TO authenticated
USING (
  chat_id IN (
    SELECT chat_id FROM a_chat_users WHERE user_id = auth.uid()
  )
);

-- Note: The existing policy "Users can delete their empty chats" on a_chat remains unchanged and will now succeed
-- because participants are able to remove all associated messages and chat_user rows first. 
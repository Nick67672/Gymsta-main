/*
  Add delete policies for chat tables so users can remove their own messages and empty chats
*/

-- Enable RLS just in case (idempotent)
ALTER TABLE IF EXISTS a_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS a_chat ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (keeps migration idempotent)
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON a_chat_messages;
DROP POLICY IF EXISTS "Users can delete their empty chats" ON a_chat;

-- 1) Allow a user to delete a message they authored
CREATE POLICY "Users can delete their own chat messages"
ON a_chat_messages
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 2) Allow a user to delete a chat **only** when they are a participant and the chat has no remaining messages.
--    (We use a WITH CHECK clause rather than USING because deleting a chat has no row to check after the delete.)
CREATE POLICY "Users can delete their empty chats"
ON a_chat
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT chat_id FROM a_chat_users WHERE user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM a_chat_messages WHERE a_chat_messages.chat_id = id
  )
); 
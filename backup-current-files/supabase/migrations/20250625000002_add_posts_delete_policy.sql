/*
  # Add Posts Delete Policy

  1. Changes
    - Add DELETE policy to allow users to delete their own posts
    - Add UPDATE policy to allow users to update their own posts (may have been dropped)
    - Add INSERT policy to allow users to create posts (may have been dropped)

  2. Security
    - Users can only delete/update/create their own posts
    - Must be authenticated
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Allow users to insert their own posts
CREATE POLICY "Users can create their own posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts (for editing captions, etc.)
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id); 
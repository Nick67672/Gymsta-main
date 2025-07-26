/*
  # Fix Posts Privacy Policies - Final

  1. Changes
    - Ensure all old posts policies are dropped
    - Create the correct privacy-respecting policy
    - Handle any potential conflicts

  2. Security
    - Private accounts' posts only visible to followers
    - Public accounts' posts visible to everyone
    - Users can always see their own posts
*/

-- Drop ALL existing posts SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by followers or if account is public" ON posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;

-- Create the definitive posts privacy policy
CREATE POLICY "Posts respect account privacy settings"
ON posts
FOR SELECT
TO authenticated
USING (
  (
    -- User is viewing their own posts
    auth.uid() = user_id
  ) OR (
    -- Post is from a public account
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = posts.user_id
      AND profiles.is_private = true
    )
  ) OR (
    -- Post is from a private account but viewer is a follower
    EXISTS (
      SELECT 1 FROM followers
      WHERE followers.following_id = posts.user_id
      AND followers.follower_id = auth.uid()
    )
  )
);

-- Also create policy for anonymous users (public posts only)
CREATE POLICY "Anonymous users can view public posts only"
ON posts
FOR SELECT
TO anon
USING (
  NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = posts.user_id
    AND profiles.is_private = true
  )
); 
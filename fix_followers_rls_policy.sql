-- Fix RLS policy for followers table to allow accepting follow requests
-- Users need to be able to create follow relationships where they are either the follower OR the following

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own follows" ON followers;

-- Create new policies that allow both following others and accepting follow requests
CREATE POLICY "Users can follow others"
  ON followers
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can accept follow requests"
  ON followers
  FOR INSERT
  WITH CHECK (auth.uid() = following_id);

CREATE POLICY "Users can unfollow others"
  ON followers
  FOR DELETE
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can remove followers"
  ON followers
  FOR DELETE
  USING (auth.uid() = following_id);

CREATE POLICY "Users can update their own follow relationships"
  ON followers
  FOR UPDATE
  USING (auth.uid() = follower_id OR auth.uid() = following_id); 
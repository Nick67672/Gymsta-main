/*
  # Update get_feed_posts function to respect private account privacy

  This script updates the `get_feed_posts` function to properly handle private accounts.
  Private accounts' posts will only be visible to users who follow them.

  ## Changes:
  - Add privacy filtering logic to exclude private account posts from non-followers
  - Maintain existing blocking logic
  - Ensure users can always see their own posts
  - Keep performance optimized with proper indexing considerations

  ## Security:
  - Private accounts' posts only visible to followers
  - Public accounts' posts visible to everyone (except blocked users)
  - Users can always see their own posts
*/

CREATE OR REPLACE FUNCTION get_feed_posts()
RETURNS SETOF posts
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM posts
  WHERE
    -- Exclude posts from users that the current user has blocked
    posts.user_id NOT IN (
      SELECT blocked_id
      FROM blocked_users
      WHERE blocker_id = auth.uid()
    )
    AND
    -- Exclude posts from users who have blocked the current user
    posts.user_id NOT IN (
      SELECT blocker_id
      FROM blocked_users
      WHERE blocked_id = auth.uid()
    )
    AND
    -- Privacy logic: Only show posts from private accounts if user is following them
    (
      -- User can always see their own posts
      posts.user_id = auth.uid()
      OR
      -- Posts from public accounts are visible to everyone
      NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = posts.user_id
        AND profiles.is_private = true
      )
      OR
      -- Posts from private accounts are only visible to followers
      EXISTS (
        SELECT 1 FROM followers
        WHERE followers.following_id = posts.user_id
        AND followers.follower_id = auth.uid()
      )
    )
  ORDER BY
    posts.created_at DESC;
$$; 
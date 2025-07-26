/*
  # Create a PostgreSQL function to get the user's feed posts

  This script creates a new database function `get_feed_posts` that securely
  retrieves a personalized feed for the currently authenticated user.

  ## Functionality:
  - The function returns a set of `posts` records.
  - It enforces all Row Level Security (RLS) policies automatically.
  - It filters out posts from users that the current user has blocked.
  - The feed is ordered chronologically, with the newest posts first.

  ## Benefits:
  - **Security:** Moves complex data-fetching logic to the backend, ensuring
    RLS policies cannot be bypassed on the client.
  - **Performance:** Reduces the workload on the client device by performing
    all filtering and sorting on the database server.
  - **Simplicity:** The client-side code becomes much simpler, as it only needs
    to make a single RPC call.
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
  ORDER BY
    posts.created_at DESC;
$$; 
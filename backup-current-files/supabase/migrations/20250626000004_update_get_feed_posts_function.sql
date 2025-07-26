/*
  # Update the get_feed_posts function to include profile data

  This script modifies the `get_feed_posts` function to correctly join `posts`
  with the `profiles` table.

  ## Changes:
  - **Return Type:** Changed from `SETOF posts` to `RETURNS TABLE(...)` to
    define the exact output structure, including all necessary columns from
    both tables. This is more explicit and safer than returning `json`.
  - **JOINs:** The function now correctly performs a `LEFT JOIN` on `profiles`
    to include author information and a `LEFT JOIN` on `likes` to get the
    like count for each post.
  - **Logic:** The core filtering logic (blocking and RLS) remains the same,
    but it's now applied to the joined result.
*/

DROP FUNCTION IF EXISTS get_feed_posts();

CREATE OR REPLACE FUNCTION get_feed_posts()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  caption text,
  image_url text,
  media_type text,
  created_at timestamptz,
  product_id uuid,
  profiles json,
  likes json[]
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id,
      p.user_id,
      p.caption,
      p.image_url,
      p.media_type,
      p.created_at,
      p.product_id,
      json_build_object(
        'id', pr.id,
        'username', pr.username,
        'avatar_url', pr.avatar_url,
        'is_verified', pr.is_verified
      ) as profiles,
      COALESCE(
        array_agg(json_build_object('user_id', pl.user_id, 'id', pl.id)) FILTER (WHERE pl.id IS NOT NULL),
        '{}'
      ) as likes
    FROM
      posts p
    LEFT JOIN
      profiles pr ON p.user_id = pr.id
    LEFT JOIN
      likes pl ON pl.post_id = p.id
    WHERE
      p.user_id NOT IN (
        SELECT blocked_id
        FROM blocked_users
        WHERE blocker_id = auth.uid()
      )
      AND
      p.user_id NOT IN (
        SELECT blocker_id
        FROM blocked_users
        WHERE blocked_id = auth.uid()
      )
    GROUP BY
      p.id, pr.id
    ORDER BY
      p.created_at DESC;
END;
$$; 
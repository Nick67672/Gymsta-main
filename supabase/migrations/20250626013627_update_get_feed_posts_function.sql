CREATE OR REPLACE FUNCTION public.get_feed_posts()
RETURNS SETOF posts
LANGUAGE sql
STABLE
AS $$
  SELECT p.*
  FROM posts p
  WHERE public.can_view_profile(p.user_id)
  ORDER BY p.created_at DESC;
$$; 
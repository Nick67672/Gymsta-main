CREATE OR REPLACE FUNCTION public.get_feed_posts()
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
        'is_verified', pr.is_verified,
        'gym', pr.gym
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
      public.can_view_profile(p.user_id)
    GROUP BY
      p.id, pr.id
    ORDER BY
      p.created_at DESC;
END;
$$; 
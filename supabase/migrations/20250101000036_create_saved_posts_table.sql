-- Create saved_posts table for bookmark functionality
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_created_at ON saved_posts(created_at DESC);

-- Add RLS policies
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved posts
CREATE POLICY "Users can view their own saved posts" ON saved_posts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saved posts
CREATE POLICY "Users can save posts" ON saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved posts
CREATE POLICY "Users can unsave posts" ON saved_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to get saved posts with post details
CREATE OR REPLACE FUNCTION get_saved_posts(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  post_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.post_id,
    sp.created_at,
    jsonb_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'caption', p.caption,
      'image_url', p.image_url,
      'media_type', p.media_type,
      'created_at', p.created_at,
      'product_id', p.product_id,
      'profiles', jsonb_build_object(
        'id', prof.id,
        'username', prof.username,
        'avatar_url', prof.avatar_url,
        'is_verified', prof.is_verified,
        'gym', prof.gym
      ),
      'likes', COALESCE(likes_data.likes, '[]'::jsonb),
      'comments_count', COALESCE(comments_data.count, 0)
    ) as post_data
  FROM saved_posts sp
  JOIN posts p ON sp.post_id = p.id
  JOIN profiles prof ON p.user_id = prof.id
  LEFT JOIN (
    SELECT 
      l.post_id AS post_id,
      jsonb_agg(jsonb_build_object('id', l.id, 'user_id', l.user_id)) AS likes
    FROM likes l
    GROUP BY l.post_id
  ) likes_data ON p.id = likes_data.post_id
  LEFT JOIN (
    SELECT 
      c.post_id AS post_id,
      COUNT(*) AS count
    FROM comments c
    GROUP BY c.post_id
  ) comments_data ON p.id = comments_data.post_id
  WHERE sp.user_id = user_uuid
  ORDER BY sp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON saved_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_saved_posts(UUID) TO authenticated; 
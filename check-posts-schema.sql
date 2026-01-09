-- Check if posts table has workout_id and post_type columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'posts'
ORDER BY ordinal_position;

-- Check recent posts
SELECT 
    id,
    user_id,
    workout_id,
    post_type,
    caption,
    created_at
FROM posts 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if any posts have workout_id
SELECT 
    COUNT(*) as total_posts,
    COUNT(workout_id) as posts_with_workout_id,
    COUNT(CASE WHEN post_type = 'workout' THEN 1 END) as workout_type_posts
FROM posts;

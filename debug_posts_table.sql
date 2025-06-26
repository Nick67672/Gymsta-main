-- Debug Posts Table and Policies
-- Run this to diagnose issues with post deletion

-- 1. Check if posts table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' 
ORDER BY ordinal_position;

-- 2. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'posts';

-- 3. List all policies on posts table
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname;

-- 4. Check current user authentication
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as user_email,
  auth.role() as current_role;

-- 5. Check if there are any posts in the table
SELECT COUNT(*) as total_posts FROM posts;

-- 6. Show sample posts with user_id (limit 3 for privacy)
SELECT id, user_id, LEFT(caption, 50) as caption_preview, created_at 
FROM posts 
ORDER BY created_at DESC 
LIMIT 3;

-- 7. Test if we can see posts (should work if SELECT policy allows it)
SELECT id, user_id 
FROM posts 
WHERE user_id = auth.uid() 
LIMIT 1;

-- 8. Test if you can select your own posts
SELECT id, user_id, caption 
FROM posts 
WHERE user_id = auth.uid() 
LIMIT 3;

-- 9. Try a manual delete test (uncomment and replace with your post ID)
-- DELETE FROM posts WHERE id = 'YOUR_POST_ID_HERE' AND user_id = auth.uid(); 
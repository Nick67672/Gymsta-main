-- Test SQL to check current policies on posts table
-- Run this in your Supabase SQL Editor to see what policies exist

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname; 

-- Test Delete Posts Policy
-- This script tests if the RLS policies for deleting posts are working correctly

-- First, let's check what policies exist on the posts table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'posts' AND cmd = 'DELETE';

-- Check if RLS is enabled on the posts table (simplified for compatibility)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'posts';

-- Test the delete policy by checking what posts exist
-- (This would need to be run with a specific user context in a real test)
SELECT id, user_id, caption, created_at 
FROM posts 
LIMIT 5;

-- Check if the auth.uid() function is working
SELECT auth.uid() as current_user_id; 
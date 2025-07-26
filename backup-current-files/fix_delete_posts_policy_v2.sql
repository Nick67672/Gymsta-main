-- Fix Delete Posts Policy v2
-- Enhanced version with better error handling and verification

-- First, check if RLS is enabled (enable if not)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON posts;

-- Enable SELECT for all authenticated users (needed to see posts)
CREATE POLICY "Enable read access for all users"
ON posts
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own posts
CREATE POLICY "Users can create their own posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
  policyname, 
  cmd, 
  permissive,
  roles,
  CASE 
    WHEN cmd = 'DELETE' THEN 'USING: ' || COALESCE(qual, 'NULL')
    WHEN cmd = 'INSERT' THEN 'WITH CHECK: ' || COALESCE(with_check, 'NULL')
    WHEN cmd = 'UPDATE' THEN 'USING: ' || COALESCE(qual, 'NULL') || ' WITH CHECK: ' || COALESCE(with_check, 'NULL')
    WHEN cmd = 'SELECT' THEN 'USING: ' || COALESCE(qual, 'NULL')
    ELSE 'OTHER'
  END as policy_conditions
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname; 
/*
  # Final Fix for Posts Privacy (v3)

  This script ensures the RLS (Row Level Security) policies for the `posts` table
  are correctly configured to protect the privacy of users with private accounts.

  ## Changes:
  1. **Drop All Existing Policies:** All current `SELECT` policies on the `posts`
     table are removed to prevent any potential conflicts or outdated rules.
  2. **Recreate Authenticated User Policy:** A single, definitive policy is
     created for authenticated users. This policy grants access based on a few clear rules:
      - Users can always see their own posts.
      - Posts from public accounts are visible to any authenticated user.
      - Posts from private accounts are visible **only** to users who are accepted followers.
  3. **Recreate Anonymous User Policy:** A separate policy is created for
     unauthenticated (anonymous) users, allowing them to see **only** posts from public accounts.

  ## Security Logic:
  - `auth.uid() = user_id`: Checks if the current user is the owner of the post.
  - `NOT profiles.is_private`: Checks if the post's author has a public profile.
  - `EXISTS (SELECT 1 FROM followers ...)`: Checks for a confirmed follow relationship
    between the current user and the post's author.
*/

-- Step 1: Drop all existing SELECT policies on the 'posts' table to ensure a clean slate.
DROP POLICY IF EXISTS "Posts respect account privacy settings" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can view public posts only" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy settings" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can only see posts from public accounts" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by followers or if account is public" ON posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;

-- Step 2: Create the definitive RLS policy for authenticated users.
CREATE POLICY "Authenticated users can view posts based on privacy"
ON public.posts
FOR SELECT
TO authenticated
USING (
  -- Users can see their own posts
  auth.uid() = posts.user_id
  OR
  -- Or, the post is from a public account
  (
    SELECT NOT p.is_private
    FROM public.profiles p
    WHERE p.id = posts.user_id
  )
  OR
  -- Or, the post is from a private account AND the viewer is an accepted follower
  (
    EXISTS (
      SELECT 1
      FROM public.followers f
      WHERE f.following_id = posts.user_id AND f.follower_id = auth.uid()
    )
  )
);

-- Step 3: Create the RLS policy for anonymous (unauthenticated) users.
CREATE POLICY "Anonymous users can only view posts from public accounts"
ON public.posts
FOR SELECT
TO anon
USING (
  -- The post must be from a public account
  (
    SELECT NOT p.is_private
    FROM public.profiles p
    WHERE p.id = posts.user_id
  )
); 
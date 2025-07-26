/*
  # Final RLS Policy for Posts using Helper Function (v3)

  This script updates the RLS policy to cast the `user_id` to `text` before
  passing it to the `can_view_posts` helper function, matching its new
  signature.

  ## Changes:
  - **Explicit Type Cast:** Changed the cast from `::uuid` to `::text`.
*/

-- Drop all previous SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Posts respect account privacy settings" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can view public posts only" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy settings" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can only see posts from public accounts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view posts based on privacy" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy function" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can view public posts based on privacy function" ON public.posts;


-- Create a new, simplified policy for authenticated users
CREATE POLICY "Users can view posts based on privacy function"
ON public.posts
FOR SELECT
TO authenticated
USING (
  public.can_view_posts(posts.user_id::text) -- Cast to text to match function
);

-- Create a policy for anonymous users
CREATE POLICY "Anonymous users can view public posts based on privacy function"
ON public.posts
FOR SELECT
TO anon
USING (
  public.can_view_posts(posts.user_id::text) -- Cast to text to match function
); 
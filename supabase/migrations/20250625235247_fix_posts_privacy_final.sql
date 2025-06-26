-- Drop existing policies to ensure a clean slate.
-- It's safe to drop them if they don't exist.
DROP POLICY IF EXISTS "Users can view posts based on privacy function" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can view public posts based on privacy function" ON public.posts;
DROP POLICY IF EXISTS "Posts are visible to users that can view the profile" ON public.posts; -- Pre-emptively drop the new name too

-- Create a single policy for all SELECT operations on posts.
-- This policy applies to both anonymous and authenticated users.
-- It delegates the logic to the `can_view_profile` function, which
-- correctly handles public profiles, private profiles, followers, and blocking.
CREATE POLICY "Posts are visible to users that can view the profile"
ON public.posts
FOR SELECT
TO public -- Applies to anon and authenticated
USING (
  public.can_view_profile(user_id)
);

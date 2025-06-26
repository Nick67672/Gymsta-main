/*
  # Unify RLS Policies for Profiles and Posts

  This script provides the definitive, synchronized RLS policies for the
  `profiles` and `posts` tables, using the new `can_view_profile` function
  as a single source of truth for visibility.

  ## Changes:
  - **Drop All Old Policies:** All previous SELECT policies on both `posts`
    and `profiles` are dropped to ensure a clean slate.
  - **Apply Unified Policy:** The `can_view_profile` function is applied
    as the RLS check for both tables, ensuring their visibility rules
    are perfectly synchronized.
*/

-- Drop all previous SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view posts based on privacy function" ON public.posts;
DROP POLICY IF EXISTS "Anonymous users can view public posts based on privacy function" ON public.posts;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by followers" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;

-- === PROFILES TABLE ===
CREATE POLICY "Users can view profiles based on privacy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.can_view_profile(id)
);

-- === POSTS TABLE ===
CREATE POLICY "Users can view posts based on profile visibility"
ON public.posts
FOR SELECT
TO authenticated
USING (
  public.can_view_profile(user_id)
); 
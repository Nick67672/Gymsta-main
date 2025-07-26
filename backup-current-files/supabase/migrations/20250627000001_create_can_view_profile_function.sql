/*
  # Create a centralized function for profile visibility

  This script creates a single, definitive helper function `can_view_profile`
  that will be the source of truth for all content visibility rules. This
  ensures that if a user cannot see a profile, they also cannot see that
  profile's posts, workouts, or other content.

  ## Functionality:
  - Takes a `profile_id` as input.
  - Returns `true` if the currently authenticated user is allowed to see that
    profile and its associated content.

  ## Logic:
  - A user can view a profile if...
    1. It is their own profile.
    2. The profile is not private.
    3. The profile IS private, but the current user is an accepted follower.
*/

CREATE OR REPLACE FUNCTION public.can_view_profile(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  is_private_profile boolean;
  is_following boolean;
  is_blocked boolean;
BEGIN
  -- Rule 1: Users can always see their own profile
  IF profile_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- Rule 2: Blocked users cannot see each other's profiles
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = profile_id)
       OR (blocker_id = profile_id AND blocked_id = auth.uid())
  ) INTO is_blocked;

  IF is_blocked THEN
    RETURN false;
  END IF;

  -- Rule 3: Check the privacy setting of the target profile
  SELECT is_private INTO is_private_profile
  FROM public.profiles
  WHERE id = profile_id;

  -- Rule 4: If the profile is not private, it's visible
  IF is_private_profile = false THEN
    RETURN true;
  END IF;

  -- Rule 5: If the profile is private, check for a follow relationship
  SELECT EXISTS (
    SELECT 1
    FROM public.followers
    WHERE following_id = profile_id AND follower_id = auth.uid()
  ) INTO is_following;
  
  RETURN is_following;
END;
$$; 
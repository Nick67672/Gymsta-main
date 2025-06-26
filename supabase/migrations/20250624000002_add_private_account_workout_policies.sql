/*
  # Update Workout RLS Policies for Private Accounts

  1. Changes
    - Update workout policies to respect private account settings
    - Only allow viewing workouts from private accounts if you follow them
    - Maintain existing policies for public accounts and own workouts

  2. Security
    - Private accounts' workouts only visible to followers
    - Public accounts' workouts remain visible to everyone
    - Users can always view their own workouts
*/

-- Drop existing workout policies that don't respect privacy
DROP POLICY IF EXISTS "Users can view global workouts" ON workouts;
DROP POLICY IF EXISTS "Users can view workouts from their gym" ON workouts;

-- Create comprehensive workout visibility policy
CREATE POLICY "Workouts are viewable by followers or if account is public"
ON workouts
FOR SELECT
TO authenticated
USING (
  (
    -- User is viewing their own workouts
    auth.uid() = user_id
  ) OR (
    -- Workout is from a public account
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = workouts.user_id
      AND profiles.is_private = true
    )
  ) OR (
    -- Workout is from a private account but viewer is a follower
    EXISTS (
      SELECT 1 FROM followers
      WHERE followers.following_id = workouts.user_id
      AND followers.follower_id = auth.uid()
    )
  )
);

-- Create policy for gym workouts that respects privacy
CREATE POLICY "Users can view workouts from their gym if account is public or followed"
ON workouts
FOR SELECT
TO authenticated
USING (
  is_private = false AND
  gym = (SELECT gym FROM profiles WHERE id = auth.uid()) AND
  (
    -- Workout is from a public account
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = workouts.user_id
      AND profiles.is_private = true
    ) OR (
      -- Workout is from a private account but viewer is a follower
      EXISTS (
        SELECT 1 FROM followers
        WHERE followers.following_id = workouts.user_id
        AND followers.follower_id = auth.uid()
      )
    )
  )
); 
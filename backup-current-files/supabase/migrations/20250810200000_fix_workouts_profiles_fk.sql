/*
  # Fix Workouts ↔ Profiles Relationship

  This migration updates the `workouts` table so that it references `profiles (id)` instead of `auth.users (id)`.  
  PostgREST requires a direct foreign-key relationship between `workouts` and `profiles` for implicit joins (e.g. `profiles!inner`).  

  1. Drop the existing FK that points to `auth.users`.  
  2. Add a new FK that points to `public.profiles`.  
*/

-- 1. Drop the old foreign-key constraint if it exists
ALTER TABLE public.workouts
DROP CONSTRAINT IF EXISTS workouts_user_id_fkey;

-- 2. Create the new foreign-key constraint referencing profiles(id)
ALTER TABLE public.workouts
ADD CONSTRAINT workouts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE; 
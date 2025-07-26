-- Phase 2: Add Features - Workout Sharing Information

-- 1. Create the workout_sharing_information table to store post-workout summaries
CREATE TABLE IF NOT EXISTS public.workout_sharing_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- User-entered metadata
    title TEXT,
    caption TEXT,
    private_notes TEXT,
    photo_url TEXT,

    -- Visibility toggles
    is_my_gym BOOLEAN NOT NULL DEFAULT FALSE,
    is_just_for_me BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Row Level Security (RLS)
ALTER TABLE public.workout_sharing_information ENABLE ROW LEVEL SECURITY;

-- Policy: users can insert their own records
CREATE POLICY "Users can insert their workout sharing information" 
ON public.workout_sharing_information
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: users can view their own records or those linked to workouts they can view
CREATE POLICY "Users can view workout sharing information" 
ON public.workout_sharing_information
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id                       -- owner
    OR auth.uid() = (SELECT user_id FROM public.workouts w WHERE w.id = workout_id)  -- owner of workout
);

-- Policy: users can update their own records
CREATE POLICY "Users can update their workout sharing information" 
ON public.workout_sharing_information
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: users can delete their own records
CREATE POLICY "Users can delete their workout sharing information" 
ON public.workout_sharing_information
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_workout_share_workout_id ON public.workout_sharing_information(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_share_user_id ON public.workout_sharing_information(user_id); 
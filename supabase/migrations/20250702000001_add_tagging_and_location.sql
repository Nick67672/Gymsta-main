-- Phase 2: Add Features - User Tagging & Location

-- 1. Create a table to store post tags (mentions)
CREATE TABLE IF NOT EXISTS public.post_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Add a unique constraint to prevent duplicate tags per post
    CONSTRAINT unique_post_user_tag UNIQUE(post_id, user_id)
);

-- 2. Add RLS policies for the new post_tags table
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Allow users to insert tags
CREATE POLICY "Users can insert their own tags"
ON public.post_tags
FOR INSERT
TO authenticated
WITH CHECK (true); -- Further checks can be done in application logic

-- Allow users to view tags
CREATE POLICY "Users can view tags"
ON public.post_tags
FOR SELECT
TO authenticated
USING (true);

-- Allow users to delete tags on their own posts
CREATE POLICY "Users can delete tags on their own posts"
ON public.post_tags
FOR DELETE
TO authenticated
USING (auth.uid() = (SELECT user_id FROM posts WHERE id = post_id));

-- 3. Add location columns to the posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS latitude REAL,
ADD COLUMN IF NOT EXISTS longitude REAL;

-- 4. Add an index for post_id on post_tags for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON public.post_tags(post_id);

-- 5. Add an index for user_id on post_tags for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_tags_user_id ON public.post_tags(user_id);

-- 6. Add a geospatial index for location if you plan to do proximity searches
-- This requires the postgis extension. You may need to enable it in your Supabase project.
-- CREATE INDEX IF NOT EXISTS posts_location_idx ON public.posts USING gist (st_geographyfromtext(format('POINT(%s %s)', longitude, latitude))); 
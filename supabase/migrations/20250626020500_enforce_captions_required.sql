-- Enforce non-empty captions for posts and workout shares (new/updated rows only)

-- Posts: require caption to be non-null and non-blank
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_posts_caption_required'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT chk_posts_caption_required
      CHECK (caption IS NOT NULL AND length(btrim(caption)) > 0) NOT VALID;
  END IF;
END $$;

-- Workout sharing information: require caption to be non-null and non-blank
DO $$
BEGIN
  IF to_regclass('public.workout_sharing_information') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'chk_wsi_caption_required'
    ) THEN
      ALTER TABLE public.workout_sharing_information
        ADD CONSTRAINT chk_wsi_caption_required
        CHECK (caption IS NOT NULL AND length(btrim(caption)) > 0) NOT VALID;
    END IF;
  END IF;
END $$;




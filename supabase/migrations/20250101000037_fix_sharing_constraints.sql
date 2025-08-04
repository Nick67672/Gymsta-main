-- Fix Sharing Constraints Migration
-- This migration fixes the constraint issues and ensures proper data migration

-- 1. Drop the existing constraint to allow data migration
ALTER TABLE content_shares DROP CONSTRAINT IF EXISTS content_shares_share_type_check;

-- 2. Recreate the constraint with all necessary values
ALTER TABLE content_shares ADD CONSTRAINT content_shares_share_type_check 
CHECK (share_type IN (
    'direct_message', 
    'external_share', 
    'external_link',
    'copy_link', 
    'social_media',
    'email',
    'instagram',
    'story_repost'
));

-- 3. Update any existing 'external_link' values to 'external_share' for consistency
UPDATE content_shares 
SET share_type = 'external_share' 
WHERE share_type = 'external_link';

-- 4. Now drop the constraint again and recreate it without 'external_link'
ALTER TABLE content_shares DROP CONSTRAINT content_shares_share_type_check;

ALTER TABLE content_shares ADD CONSTRAINT content_shares_share_type_check 
CHECK (share_type IN (
    'direct_message', 
    'external_share', 
    'copy_link', 
    'social_media',
    'email',
    'instagram',
    'story_repost'
));

-- 5. Clean up any invalid share_medium values
UPDATE content_shares 
SET share_medium = 'native_share' 
WHERE share_medium = 'unknown';

-- 6. Ensure all share_medium values are valid
ALTER TABLE content_shares DROP CONSTRAINT IF EXISTS content_shares_share_medium_check;

ALTER TABLE content_shares ADD CONSTRAINT content_shares_share_medium_check 
CHECK (share_medium IN (
    'chat', 
    'instagram', 
    'twitter', 
    'facebook', 
    'whatsapp', 
    'telegram', 
    'email', 
    'copy',
    'native_share',
    'clipboard'
));

-- 7. Update any invalid share_medium values to valid ones
UPDATE content_shares 
SET share_medium = 'native_share' 
WHERE share_medium NOT IN (
    'chat', 
    'instagram', 
    'twitter', 
    'facebook', 
    'whatsapp', 
    'telegram', 
    'email', 
    'copy',
    'native_share',
    'clipboard'
);

-- 8. Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_content_shares_post_id ON content_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_workout_id ON content_shares(workout_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_sharer_id ON content_shares(sharer_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_recipient_id ON content_shares(recipient_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_created_at ON content_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_shares_type_medium ON content_shares(share_type, share_medium);

-- 9. Update the trigger function to handle the new constraint values
CREATE OR REPLACE FUNCTION update_content_share_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update post share count
    IF NEW.post_id IS NOT NULL THEN
        UPDATE posts 
        SET share_count = (
            SELECT COUNT(*) 
            FROM content_shares 
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;
    END IF;

    -- Update workout share count
    IF NEW.workout_id IS NOT NULL THEN
        UPDATE workouts 
        SET share_count = (
            SELECT COUNT(*) 
            FROM content_shares 
            WHERE workout_id = NEW.workout_id
        )
        WHERE id = NEW.workout_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Ensure the trigger exists
DROP TRIGGER IF EXISTS update_content_share_count_trigger ON content_shares;
CREATE TRIGGER update_content_share_count_trigger
    AFTER INSERT OR DELETE ON content_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_content_share_count();

-- 11. Update share counts for existing content
UPDATE posts 
SET share_count = (
    SELECT COUNT(*) 
    FROM content_shares 
    WHERE post_id = posts.id
);

UPDATE workouts 
SET share_count = (
    SELECT COUNT(*) 
    FROM content_shares 
    WHERE workout_id = workouts.id
); 
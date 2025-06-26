-- Fix follow request cleanup on unfollow
-- Date: 2024-12-29
-- This migration adds automatic cleanup of follow requests when someone unfollows
-- Prevents unique constraint violations when trying to re-follow

-- Create function to clean up follow requests when unfollowing
CREATE OR REPLACE FUNCTION cleanup_follow_requests_on_unfollow()
RETURNS TRIGGER AS $$
BEGIN
  -- When a follow relationship is deleted, also delete any pending follow requests
  -- This prevents unique constraint violations when trying to re-follow
  DELETE FROM follow_requests 
  WHERE requester_id = OLD.follower_id 
    AND requested_id = OLD.following_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS cleanup_follow_requests_trigger ON followers;

-- Create trigger to run cleanup when someone unfollows
CREATE TRIGGER cleanup_follow_requests_trigger
  AFTER DELETE ON followers
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_follow_requests_on_unfollow();

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_follow_requests_on_unfollow() IS 'Automatically cleans up follow requests when a user unfollows someone to prevent unique constraint violations on re-follow'; 
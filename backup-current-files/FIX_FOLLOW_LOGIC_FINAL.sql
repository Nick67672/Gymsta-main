-- This script completely resets and fixes the follow/unfollow/notification logic.
-- It is designed to be run once to correct the state of the database.

-- STEP 1: Drop all potentially conflicting functions and triggers.
-- We drop them so we can recreate them with the correct logic without conflicts.
DROP TRIGGER IF EXISTS on_new_follow ON followers;
DROP TRIGGER IF EXISTS comprehensive_unfollow_cleanup_trigger ON followers;
DROP TRIGGER IF EXISTS on_unfollow_cleanup ON followers;
DROP TRIGGER IF EXISTS cleanup_on_unfollow_trigger ON followers;
DROP TRIGGER IF EXISTS cleanup_follow_requests_trigger ON followers;

DROP TRIGGER IF EXISTS on_new_follow_request ON follow_requests;
DROP TRIGGER IF EXISTS on_follow_request_deleted ON follow_requests;

DROP FUNCTION IF EXISTS create_follow_notification() CASCADE;
DROP FUNCTION IF EXISTS comprehensive_unfollow_cleanup() CASCADE;
DROP FUNCTION IF EXISTS cleanup_on_unfollow() CASCADE;
DROP FUNCTION IF EXISTS cleanup_on_unfollow_trigger() CASCADE;
DROP FUNCTION IF EXISTS cleanup_follow_requests_on_unfollow() CASCADE;
DROP FUNCTION IF EXISTS create_follow_request_notification() CASCADE;
DROP FUNCTION IF EXISTS delete_follow_request_notification() CASCADE;
DROP FUNCTION IF EXISTS accept_follow_request(uuid, uuid) CASCADE;


-- STEP 2: Re-create the function to handle accepting a follow request.
-- This is called from the app when a user approves a request.
CREATE OR REPLACE FUNCTION public.accept_follow_request(p_requester_id uuid, p_requested_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- The user accepting the request must be the one who was requested.
  IF p_requested_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to accept this follow request.';
  END IF;

  -- Create the follower relationship. This will trigger the `on_new_follow` trigger.
  INSERT INTO public.followers (follower_id, following_id)
  VALUES (p_requester_id, p_requested_id);

  -- Delete the original follow request. This will trigger the `on_follow_request_deleted` trigger.
  DELETE FROM public.follow_requests
  WHERE requester_id = p_requester_id AND requested_id = p_requested_id;
END;
$function$;
COMMENT ON FUNCTION public.accept_follow_request(uuid, uuid) IS 'Handles accepting a follow request by creating the relationship and deleting the request.';


-- STEP 3: Create notification logic for NEW FOLLOWS.
-- This creates a 'follow' notification when a follower relationship is made.
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.notifications(user_id, actor_id, type)
  VALUES(NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_notification();


-- STEP 4: Create cleanup logic for UNFOLLOWS.
-- This deletes the 'follow' notification when a user unfollows.
CREATE OR REPLACE FUNCTION public.cleanup_on_unfollow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- When A unfollows B, delete the "A started following you" notification from B's feed.
  DELETE FROM public.notifications 
  WHERE type = 'follow' 
    AND actor_id = OLD.follower_id 
    AND user_id = OLD.following_id;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER on_unfollow_cleanup
  AFTER DELETE ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_on_unfollow();


-- STEP 5: Create notification logic for NEW FOLLOW REQUESTS.
-- This creates a 'follow_request' notification.
CREATE OR REPLACE FUNCTION public.create_follow_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.notifications(user_id, actor_id, type)
  VALUES(NEW.requested_id, NEW.requester_id, 'follow_request');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_follow_request
  AFTER INSERT ON public.follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_follow_request_notification();


-- STEP 6: Create cleanup logic for DELETED FOLLOW REQUESTS.
-- This is for when a request is declined/cancelled, or accepted via accept_follow_request().
CREATE OR REPLACE FUNCTION public.delete_follow_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- When a follow_request is deleted, delete the corresponding notification.
  DELETE FROM public.notifications
  WHERE type = 'follow_request'
    AND actor_id = OLD.requester_id
    AND user_id = OLD.requested_id;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER on_follow_request_deleted
  AFTER DELETE ON public.follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_follow_request_notification();


-- STEP 7: Final data cleanup for any orphaned records.
-- Delete any follow requests that have already been accepted.
DELETE FROM follow_requests 
WHERE (requester_id, requested_id) IN (
  SELECT follower_id, following_id FROM followers
);

-- Delete any 'follow_request' notifications where the request no longer exists.
DELETE FROM notifications 
WHERE type = 'follow_request' 
  AND (actor_id, user_id) NOT IN (
    SELECT requester_id, requested_id FROM follow_requests
  );
  
-- Delete any 'follow' notifications where the follow relationship no longer exists.
DELETE FROM notifications 
WHERE type = 'follow' 
  AND (actor_id, user_id) NOT IN (
    SELECT follower_id, following_id FROM followers
  );

SELECT 'All follow/unfollow logic has been reset and fixed.' as status; 
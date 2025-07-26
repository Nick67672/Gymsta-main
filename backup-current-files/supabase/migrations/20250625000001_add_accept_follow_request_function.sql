CREATE OR REPLACE FUNCTION accept_follow_request(p_requester_id UUID, p_requested_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Ensure the function is run by the user who is being followed
  IF p_requested_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to accept this follow request.';
  END IF;

  -- 1. Add the follower
  INSERT INTO public.followers (follower_id, following_id)
  VALUES (p_requester_id, p_requested_id);

  -- 2. Remove the follow request
  DELETE FROM public.follow_requests
  WHERE requester_id = p_requester_id AND requested_id = p_requested_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_follow_request(UUID, UUID) IS 'Accepts a follow request, creating a follower relationship and deleting the original request.'; 
-- Add follow_request to notifications type check
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('like', 'follow', 'follow_request'));

-- Function to create follow request notifications
CREATE OR REPLACE FUNCTION create_follow_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (NEW.requested_id, NEW.requester_id, 'follow_request');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification when follow request is sent
CREATE TRIGGER follow_request_notification_trigger
  AFTER INSERT ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_request_notification();

-- Function to clean up follow request notifications when request is accepted/declined
CREATE OR REPLACE FUNCTION cleanup_follow_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications 
  WHERE user_id = OLD.requested_id 
    AND actor_id = OLD.requester_id 
    AND type = 'follow_request';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up notification when follow request is deleted
CREATE TRIGGER cleanup_follow_request_notification_trigger
  AFTER DELETE ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_follow_request_notification(); 
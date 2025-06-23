# Add Notifications System

This migration adds:
- `notifications` table for likes and follows
- `follow_requests` table for pending follow requests to private accounts
- RLS policies for both tables
- Functions to automatically create notifications

## Tables Created:
- `notifications`
- `follow_requests`

## Functions Created:
- `create_like_notification()`
- `create_follow_notification()`

## Triggers Created:
- Automatic notification creation on likes
- Automatic notification creation on follows

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'follow')),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  read boolean DEFAULT false NOT NULL
);

-- Create follow_requests table
CREATE TABLE follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  requested_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(requester_id, requested_id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for follow_requests
CREATE POLICY "Users can view follow requests they sent"
ON follow_requests
FOR SELECT
USING (requester_id = auth.uid());

CREATE POLICY "Users can view follow requests they received"
ON follow_requests
FOR SELECT
USING (requested_id = auth.uid());

CREATE POLICY "Users can create follow requests"
ON follow_requests
FOR INSERT
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can delete their own follow requests"
ON follow_requests
FOR DELETE
USING (requester_id = auth.uid());

CREATE POLICY "Users can delete follow requests sent to them"
ON follow_requests
FOR DELETE
USING (requested_id = auth.uid());

-- Function to create like notifications
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't create notification if user likes their own post
  IF NEW.user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO notifications (user_id, actor_id, type, post_id)
  VALUES (
    (SELECT user_id FROM posts WHERE id = NEW.post_id),
    NEW.user_id,
    'like',
    NEW.post_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create follow notifications
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER like_notification_trigger
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER follow_notification_trigger
  AFTER INSERT ON followers
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_follow_requests_requested_id ON follow_requests(requested_id);
CREATE INDEX idx_follow_requests_requester_id ON follow_requests(requester_id); 
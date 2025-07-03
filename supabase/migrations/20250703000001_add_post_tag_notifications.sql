ALTER TABLE notifications
DROP CONSTRAINT notifications_type_check,
ADD CONSTRAINT notifications_type_check CHECK (type IN ('like', 'follow', 'post_tag')); 
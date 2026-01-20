
-- Add parent_reply_id column to enable nested replies
ALTER TABLE forum_replies 
ADD COLUMN parent_reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE;

-- Add index for efficient nested reply queries
CREATE INDEX idx_forum_replies_parent ON forum_replies(parent_reply_id) WHERE parent_reply_id IS NOT NULL;

-- Add attachment fields to stream posts
ALTER TABLE new_team_stream_posts 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_title TEXT;

-- Create comments table for stream posts
CREATE TABLE IF NOT EXISTS new_team_stream_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES new_team_stream_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_comments_post_id ON new_team_stream_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_stream_comments_author ON new_team_stream_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_stream_comments_created_at ON new_team_stream_comments(created_at DESC);

-- Add comments to stream posts table
COMMENT ON COLUMN new_team_stream_posts.attachment_url IS 'URL of attachment for the stream post';
COMMENT ON COLUMN new_team_stream_posts.attachment_title IS 'Title/name of the attachment';
COMMENT ON TABLE new_team_stream_comments IS 'Comments on stream posts by team members';

-- Enhanced Comments System Migration
-- Created: 2025-07-20
-- Features: AI moderation, reactions, threading, real-time updates

-- 1. Enhanced Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'voice', 'image', 'gif')),
    
    -- AI Analysis Fields
    sentiment_score REAL DEFAULT 0 CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    toxicity_score REAL DEFAULT 0 CHECK (toxicity_score >= 0 AND toxicity_score <= 1),
    engagement_score REAL DEFAULT 0,
    ai_insights JSONB DEFAULT '{}',
    
    -- Moderation Fields
    is_pinned BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'auto_hidden')),
    
    -- Metrics
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    reactions_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_content_length CHECK (char_length(content) <= 2200),
    CONSTRAINT no_self_reply CHECK (id != parent_comment_id)
);

-- 2. Comment Reactions Table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'angry', 'sad', 'fire', 'clap', 'thinking', 'party')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate reactions from same user on same comment
    UNIQUE(comment_id, user_id, reaction_type)
);

-- 3. Comment Likes Table (for backward compatibility and quick likes)
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(comment_id, user_id)
);

-- 4. Comment Reports Table
CREATE TABLE IF NOT EXISTS public.comment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'misinformation', 'inappropriate', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.profiles(id),
    
    UNIQUE(comment_id, reporter_id)
);

-- 5. Comment Analytics Table
CREATE TABLE IF NOT EXISTS public.comment_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('view', 'engagement', 'share', 'save')),
    value INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(comment_id, metric_type, date)
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_engagement_score ON public.comments(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON public.comments(sentiment_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_moderation ON public.comments(moderation_status, is_hidden);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON public.comment_reactions(reaction_type);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON public.comment_reports(created_at DESC);

-- 7. Row Level Security Policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_analytics ENABLE ROW LEVEL SECURITY;

-- Comments Policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (NOT is_hidden OR auth.uid() = user_id);

CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Reactions Policies
CREATE POLICY "Reactions are viewable by everyone" ON public.comment_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reactions" ON public.comment_reactions
    FOR ALL USING (auth.uid() = user_id);

-- Likes Policies
CREATE POLICY "Likes are viewable by everyone" ON public.comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON public.comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- Reports Policies
CREATE POLICY "Users can create reports" ON public.comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.comment_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Analytics Policies (read-only for users)
CREATE POLICY "Analytics are viewable by comment owners" ON public.comment_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.comments 
            WHERE comments.id = comment_analytics.comment_id 
            AND comments.user_id = auth.uid()
        )
    );

-- 8. Functions for Real-time Updates

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update replies count for parent comment
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE public.comments 
            SET replies_count = replies_count + 1
            WHERE id = NEW.parent_comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update replies count for parent comment
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE public.comments 
            SET replies_count = GREATEST(0, replies_count - 1)
            WHERE id = OLD.parent_comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments 
        SET reactions_count = reactions_count + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments 
        SET reactions_count = GREATEST(0, reactions_count - 1)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments 
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments 
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(comment_row public.comments)
RETURNS REAL AS $$
DECLARE
    age_hours REAL;
    recency_score REAL;
    sentiment_boost REAL;
    total_score REAL;
BEGIN
    -- Calculate age in hours
    age_hours := EXTRACT(EPOCH FROM (NOW() - comment_row.created_at)) / 3600;
    
    -- Recency score (higher for newer comments, max 24 hours)
    recency_score := GREATEST(0, (24 - age_hours) / 24 * 10);
    
    -- Sentiment boost for positive comments
    sentiment_boost := CASE 
        WHEN comment_row.sentiment_score > 0.5 THEN 5
        WHEN comment_row.sentiment_score < -0.5 THEN -2
        ELSE 0
    END;
    
    -- Calculate total engagement score
    total_score := (comment_row.likes_count * 2) + 
                   (comment_row.replies_count * 3) + 
                   (comment_row.reactions_count * 1.5) +
                   recency_score + 
                   sentiment_boost;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- 9. Triggers
CREATE TRIGGER update_comment_counts_trigger
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

CREATE TRIGGER update_reaction_counts_trigger
    AFTER INSERT OR DELETE ON public.comment_reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

CREATE TRIGGER update_like_counts_trigger
    AFTER INSERT OR DELETE ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_like_counts();

-- 10. Views for Complex Queries

-- View for comments with user engagement
CREATE OR REPLACE VIEW comment_details AS
SELECT 
    c.*,
    p.username,
    p.avatar_url,
    p.is_verified,
    CASE WHEN c.user_id = posts.user_id THEN true ELSE false END as is_creator,
    calculate_engagement_score(c) as calculated_engagement_score,
    COALESCE(reaction_summary.reaction_counts, '{}') as reaction_summary
FROM public.comments c
JOIN public.profiles p ON c.user_id = p.id
JOIN public.posts ON c.post_id = posts.id
LEFT JOIN (
    SELECT 
        comment_id,
        jsonb_object_agg(reaction_type, count) as reaction_counts
    FROM (
        SELECT 
            comment_id,
            reaction_type,
            COUNT(*) as count
        FROM public.comment_reactions
        GROUP BY comment_id, reaction_type
    ) reaction_counts_subquery
    GROUP BY comment_id
) reaction_summary ON c.id = reaction_summary.comment_id;

-- View for comment threads
CREATE OR REPLACE VIEW comment_threads AS
WITH RECURSIVE thread_tree AS (
    -- Base case: top-level comments
    SELECT 
        id,
        post_id,
        user_id,
        parent_comment_id,
        content,
        created_at,
        0 as depth,
        ARRAY[id] as path,
        id as root_comment_id
    FROM public.comments
    WHERE parent_comment_id IS NULL
    
    UNION ALL
    
    -- Recursive case: replies
    SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.parent_comment_id,
        c.content,
        c.created_at,
        tt.depth + 1,
        tt.path || c.id,
        tt.root_comment_id
    FROM public.comments c
    JOIN thread_tree tt ON c.parent_comment_id = tt.id
    WHERE tt.depth < 10  -- Prevent infinite recursion
)
SELECT * FROM thread_tree ORDER BY root_comment_id, path; 
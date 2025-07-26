-- Migration: Add AI and engagement columns to existing comments table
-- Created: 2025-07-20
-- This migration adds new columns to work with existing comments infrastructure

-- 1. Add new columns to existing comments table
DO $$ 
BEGIN
    -- Add AI Analysis Fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'sentiment_score'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN sentiment_score REAL DEFAULT 0 CHECK (sentiment_score >= -1 AND sentiment_score <= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'toxicity_score'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN toxicity_score REAL DEFAULT 0 CHECK (toxicity_score >= 0 AND toxicity_score <= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'engagement_score'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN engagement_score REAL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'ai_insights'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN ai_insights JSONB DEFAULT '{}';
    END IF;

    -- Add Moderation Fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'is_hidden'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'is_flagged'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'moderation_status'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'auto_hidden'));
    END IF;

    -- Add Media Support Fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'media_url'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN media_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'media_type'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'voice', 'image', 'gif'));
    END IF;

    -- Add Threading Support
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'parent_comment_id'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
    END IF;

    -- Add Engagement Metrics
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'likes_count'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'replies_count'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN replies_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' 
        AND column_name = 'reactions_count'
    ) THEN
        ALTER TABLE public.comments 
        ADD COLUMN reactions_count INTEGER DEFAULT 0;
    END IF;

    -- Add content length constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_content_length' 
        AND table_name = 'comments'
    ) THEN
        ALTER TABLE public.comments 
        ADD CONSTRAINT valid_content_length CHECK (char_length(content) <= 2200);
    END IF;

    -- Add self-reply prevention constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'no_self_reply' 
        AND table_name = 'comments'
    ) THEN
        ALTER TABLE public.comments 
        ADD CONSTRAINT no_self_reply CHECK (id != parent_comment_id);
    END IF;

END $$;

-- 2. Create supporting tables that don't exist
CREATE TABLE IF NOT EXISTS public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'angry', 'sad', 'fire', 'clap', 'thinking', 'party')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate reactions from same user on same comment
    UNIQUE(comment_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(comment_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS public.ai_analysis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    sentiment_score REAL,
    toxicity_score REAL,
    confidence REAL,
    language TEXT,
    topics TEXT[],
    flags JSONB,
    recommended_action TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON public.comments(sentiment_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_engagement_score ON public.comments(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_moderation ON public.comments(moderation_status, is_hidden);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON public.comment_reactions(reaction_type);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports(status);

-- 4. Enable RLS on new tables
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policies for new tables
CREATE POLICY "Reactions are viewable by everyone" ON public.comment_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reactions" ON public.comment_reactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Likes are viewable by everyone" ON public.comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON public.comment_likes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports" ON public.comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.comment_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- 6. Update existing RLS policies for comments to handle new columns
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (NOT is_hidden OR auth.uid() = user_id);

-- 7. Create functions for engagement scoring and count updates
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
    total_score := (COALESCE(comment_row.likes_count, 0) * 2) + 
                   (COALESCE(comment_row.replies_count, 0) * 3) + 
                   (COALESCE(comment_row.reactions_count, 0) * 1.5) +
                   recency_score + 
                   sentiment_boost;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update replies count for parent comment
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE public.comments 
            SET replies_count = COALESCE(replies_count, 0) + 1
            WHERE id = NEW.parent_comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update replies count for parent comment
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE public.comments 
            SET replies_count = GREATEST(0, COALESCE(replies_count, 0) - 1)
            WHERE id = OLD.parent_comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments 
        SET reactions_count = COALESCE(reactions_count, 0) + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments 
        SET reactions_count = GREATEST(0, COALESCE(reactions_count, 0) - 1)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments 
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments 
        SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS update_comment_counts_trigger ON public.comments;
CREATE TRIGGER update_comment_counts_trigger
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

DROP TRIGGER IF EXISTS update_reaction_counts_trigger ON public.comment_reactions;
CREATE TRIGGER update_reaction_counts_trigger
    AFTER INSERT OR DELETE ON public.comment_reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

DROP TRIGGER IF EXISTS update_like_counts_trigger ON public.comment_likes;
CREATE TRIGGER update_like_counts_trigger
    AFTER INSERT OR DELETE ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_like_counts(); 
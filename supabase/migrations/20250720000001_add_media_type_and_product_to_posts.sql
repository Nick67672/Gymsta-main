-- Migration: Add media_type and product_id columns to posts table
-- Generated on 2025-07-20

-- 1. Add media_type column (text, default 'image') if it doesn't already exist
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- 2. Add product_id column (uuid, foreign key to products.id) if it doesn't already exist
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 3. Create an index on product_id for quicker look-ups (idempotent)
CREATE INDEX IF NOT EXISTS idx_posts_product_id ON public.posts(product_id); 
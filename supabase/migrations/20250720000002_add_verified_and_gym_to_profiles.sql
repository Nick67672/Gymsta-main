-- Migration: Add is_verified and gym columns to profiles table
-- Generated on 2025-07-20

-- 1. Add is_verified column (boolean, default false)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Add gym column (text) to store user's gym affiliation
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gym TEXT; 
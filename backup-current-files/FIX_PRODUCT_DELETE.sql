-- Fix for product deletion issue
-- Run this in your Supabase SQL Editor

-- First, check if the DELETE policy already exists
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'products' AND cmd = 'DELETE';

-- If no DELETE policy exists, create it
-- Drop the policy first if it exists (in case there's a broken one)
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

-- Add DELETE policy for products table
CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  USING (auth.uid() = seller_id);

-- Verify all policies for products table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'products' 
ORDER BY cmd;

-- Test query to check if current user can see products they own
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
SELECT id, name, seller_id, 
       seller_id = auth.uid() as "can_delete"
FROM products 
WHERE seller_id = auth.uid()
LIMIT 5;

-- Check if RLS is enabled on products table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'products'; 
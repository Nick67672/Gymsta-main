/*
  # Add DELETE policy for products table

  1. Changes
    - Add RLS policy to allow users to delete their own products
    - This was missing from the initial products table setup

  2. Security
    - Users can only delete products they own (seller_id matches auth.uid())
*/

-- Add DELETE policy for products
CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  USING (auth.uid() = seller_id); 
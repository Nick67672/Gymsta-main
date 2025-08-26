-- Add food_name for snapshotting display name at entry time
ALTER TABLE public.nutrition_entries
  ADD COLUMN IF NOT EXISTS food_name text;

-- Optional brand snapshot could be added later if needed



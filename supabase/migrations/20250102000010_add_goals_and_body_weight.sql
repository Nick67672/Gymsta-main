-- Migration: Add goals array and optional body weight to profiles
-- Generated on 2025-01-02

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS goals TEXT[] NULL,
ADD COLUMN IF NOT EXISTS body_weight_kg NUMERIC CHECK (body_weight_kg >= 0 AND body_weight_kg <= 500);

-- Optional: constrain goals to known values using a check (lenient to allow future values)
-- You can uncomment and adjust if you want strict enforcement
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_goals_allowed_values CHECK (
--     goals IS NULL OR (
--       (
--         SELECT bool_and(g IN (
--           'weight_loss','muscle_gain','strength','endurance','general_fitness','sports_performance','recovery'
--         )) FROM unnest(goals) AS g
--       )
--     )
--   );



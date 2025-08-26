/*
  # Nutrition Tracking Schema (MyFitnessPal-style)

  Tables:
    - foods: canonical foods with macro data per 100g and common serving sizes
    - user_foods: user-defined custom foods
    - nutrition_entries: per-user meal entries with quantities and macro totals
    - nutrition_goals: per-user daily macro and calorie goals

  Security:
    - RLS enabled everywhere; users can only access their own rows
*/

-- Drop existing to avoid conflicts when re-running locally
DROP TABLE IF EXISTS public.nutrition_entries CASCADE;
DROP TABLE IF EXISTS public.user_foods CASCADE;
DROP TABLE IF EXISTS public.foods CASCADE;
DROP TABLE IF EXISTS public.nutrition_goals CASCADE;

-- Ensure trigram extension for search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Canonical foods. Macro values stored per 100 grams for normalization
CREATE TABLE public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  -- Per 100g macros
  calories numeric NOT NULL CHECK (calories >= 0),
  protein_g numeric NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  fiber_g numeric NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
  sugar_g numeric NOT NULL DEFAULT 0 CHECK (sugar_g >= 0),
  sodium_mg numeric NOT NULL DEFAULT 0 CHECK (sodium_mg >= 0),
  -- Serving helpers
  default_serving_grams numeric NOT NULL DEFAULT 100 CHECK (default_serving_grams > 0),
  common_servings jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{label, grams}]
  source text, -- 'usda', 'user', 'brand', etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foods_name_trgm ON public.foods USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_created_at_idx ON public.foods(created_at);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Public read for canonical foods; only service role can modify
CREATE POLICY IF NOT EXISTS "Foods are readable by everyone" ON public.foods
  FOR SELECT USING (true);

-- User-defined custom foods (private)
CREATE TABLE public.user_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  calories numeric NOT NULL CHECK (calories >= 0),
  protein_g numeric NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  fiber_g numeric NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
  sugar_g numeric NOT NULL DEFAULT 0 CHECK (sugar_g >= 0),
  sodium_mg numeric NOT NULL DEFAULT 0 CHECK (sodium_mg >= 0),
  default_serving_grams numeric NOT NULL DEFAULT 100 CHECK (default_serving_grams > 0),
  common_servings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_foods_user_idx ON public.user_foods(user_id);
CREATE INDEX IF NOT EXISTS user_foods_name_trgm ON public.user_foods USING gin (name gin_trgm_ops);

ALTER TABLE public.user_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own user_foods" ON public.user_foods
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Per-user daily goals
CREATE TABLE public.nutrition_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_calories integer CHECK (daily_calories >= 0),
  protein_g integer CHECK (protein_g >= 0),
  carbs_g integer CHECK (carbs_g >= 0),
  fat_g integer CHECK (fat_g >= 0),
  fiber_g integer CHECK (fiber_g >= 0),
  sodium_mg integer CHECK (sodium_mg >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS nutrition_goals_user_idx ON public.nutrition_goals(user_id);
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own nutrition_goals" ON public.nutrition_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Meal entries
-- Store normalized macros at entry time for stability even if food definitions change later
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type') THEN
    CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
  END IF;
END $$;

CREATE TABLE public.nutrition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  meal meal_type NOT NULL,
  -- Link to either foods or user_foods for provenance (optional)
  food_id uuid,
  user_food_id uuid,
  source text, -- 'food', 'user_food', 'manual'
  -- Quantity
  serving_grams numeric NOT NULL CHECK (serving_grams > 0),
  servings numeric NOT NULL DEFAULT 1 CHECK (servings > 0),
  -- Snapshot of macros for this entry (total, not per 100g)
  calories numeric NOT NULL CHECK (calories >= 0),
  protein_g numeric NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  fiber_g numeric NOT NULL DEFAULT 0 CHECK (fiber_g >= 0),
  sugar_g numeric NOT NULL DEFAULT 0 CHECK (sugar_g >= 0),
  sodium_mg numeric NOT NULL DEFAULT 0 CHECK (sodium_mg >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_food_ref CHECK (
    (food_id IS NOT NULL AND user_food_id IS NULL) OR
    (food_id IS NULL AND user_food_id IS NOT NULL) OR
    (food_id IS NULL AND user_food_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS nutrition_entries_user_date_idx ON public.nutrition_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS nutrition_entries_meal_idx ON public.nutrition_entries(meal);

ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage their own nutrition_entries" ON public.nutrition_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_foods_updated_at ON public.foods;
CREATE TRIGGER trg_foods_updated_at
BEFORE UPDATE ON public.foods
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_foods_updated_at ON public.user_foods;
CREATE TRIGGER trg_user_foods_updated_at
BEFORE UPDATE ON public.user_foods
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_nutrition_goals_updated_at ON public.nutrition_goals;
CREATE TRIGGER trg_nutrition_goals_updated_at
BEFORE UPDATE ON public.nutrition_goals
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS trg_nutrition_entries_updated_at ON public.nutrition_entries;
CREATE TRIGGER trg_nutrition_entries_updated_at
BEFORE UPDATE ON public.nutrition_entries
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();



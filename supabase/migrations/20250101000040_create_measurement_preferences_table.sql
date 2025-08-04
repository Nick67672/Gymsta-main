-- Create user measurement preferences table
CREATE TABLE IF NOT EXISTS user_measurement_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_system TEXT NOT NULL DEFAULT 'imperial' CHECK (measurement_system IN ('imperial', 'metric')),
  weight_unit TEXT NOT NULL DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),
  distance_unit TEXT NOT NULL DEFAULT 'miles' CHECK (distance_unit IN ('miles', 'km')),
  height_unit TEXT NOT NULL DEFAULT 'ft' CHECK (height_unit IN ('ft', 'cm')),
  temperature_unit TEXT NOT NULL DEFAULT 'f' CHECK (temperature_unit IN ('f', 'c')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_measurement_preferences_user_id ON user_measurement_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_measurement_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own measurement preferences"
  ON user_measurement_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own measurement preferences"
  ON user_measurement_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurement preferences"
  ON user_measurement_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measurement preferences"
  ON user_measurement_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get user's preferred units with defaults
CREATE OR REPLACE FUNCTION get_user_measurement_units(p_user_id UUID)
RETURNS TABLE (
  measurement_system TEXT,
  weight_unit TEXT,
  distance_unit TEXT,
  height_unit TEXT,
  temperature_unit TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ump.measurement_system, 'imperial'::TEXT) as measurement_system,
    COALESCE(ump.weight_unit, 'lbs'::TEXT) as weight_unit,
    COALESCE(ump.distance_unit, 'miles'::TEXT) as distance_unit,
    COALESCE(ump.height_unit, 'ft'::TEXT) as height_unit,
    COALESCE(ump.temperature_unit, 'f'::TEXT) as temperature_unit
  FROM user_measurement_preferences ump
  WHERE ump.user_id = p_user_id
  UNION ALL
  SELECT 'imperial'::TEXT, 'lbs'::TEXT, 'miles'::TEXT, 'ft'::TEXT, 'f'::TEXT
  WHERE NOT EXISTS (
    SELECT 1 FROM user_measurement_preferences WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_measurement_units(UUID) TO authenticated;
-- Add missing columns to workouts table if they don't exist
DO $$ 
BEGIN
    -- Add is_completed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE workouts ADD COLUMN is_completed boolean DEFAULT false;
        RAISE NOTICE 'Added is_completed column to workouts table';
    ELSE
        RAISE NOTICE 'is_completed column already exists in workouts table';
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'name'
    ) THEN
        ALTER TABLE workouts ADD COLUMN name text;
        RAISE NOTICE 'Added name column to workouts table';
    ELSE
        RAISE NOTICE 'name column already exists in workouts table';
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'notes'
    ) THEN
        ALTER TABLE workouts ADD COLUMN notes text;
        RAISE NOTICE 'Added notes column to workouts table';
    ELSE
        RAISE NOTICE 'notes column already exists in workouts table';
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'tags'
    ) THEN
        ALTER TABLE workouts ADD COLUMN tags text[];
        RAISE NOTICE 'Added tags column to workouts table';
    ELSE
        RAISE NOTICE 'tags column already exists in workouts table';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE workouts ADD COLUMN created_at timestamp with time zone DEFAULT now();
        RAISE NOTICE 'Added created_at column to workouts table';
    ELSE
        RAISE NOTICE 'created_at column already exists in workouts table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workouts' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE workouts ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        RAISE NOTICE 'Added updated_at column to workouts table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in workouts table';
    END IF;
END $$; 
const { createClient } = require('@supabase/supabase-js');

// Use values from eas.json
const supabaseUrl = 'https://gwcdrwlwvufdubnknyyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Y2Ryd2x3dnVmZHVibmtueXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODAzMzAsImV4cCI6MjA1OTk1NjMzMH0.DIEa0TttW1UdRCUywkljuGZibDnVd1Z7C3ZUwJ_7NSE';

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSQL = `
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
`;

async function runMigration() {
  try {
    console.log('Running workout columns migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      
      // Try alternative approach - run each ALTER TABLE separately
      console.log('Trying alternative approach...');
      
      const alterCommands = [
        'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false',
        'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS name text',
        'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS notes text',
        'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS tags text[]',
        'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now()',
        'ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now()'
      ];
      
      for (const command of alterCommands) {
        try {
          const { error: alterError } = await supabase.rpc('exec_sql', { sql: command });
          if (alterError) {
            console.log(`Command failed (might already exist): ${command}`);
            console.log('Error:', alterError.message);
          } else {
            console.log(`✅ Executed: ${command}`);
          }
        } catch (e) {
          console.log(`Command failed: ${command} - ${e.message}`);
        }
      }
      
    } else {
      console.log('✅ Migration completed successfully');
      console.log('Result:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

runMigration(); 
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure you have EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Checking workout tables...');
  
  try {
    // Check if tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%workout%');

    if (error) {
      console.error('❌ Error checking tables:', error.message);
      return;
    }

    const tableNames = tables?.map(t => t.table_name) || [];
    const requiredTables = ['workouts', 'workout_exercises', 'workout_templates', 'exercise_history'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));

    if (missingTables.length === 0) {
      console.log('✅ All workout tables exist!');
      console.log('📊 Found tables:', tableNames.join(', '));
      
      // Test a simple query
      const { data: testData, error: testError } = await supabase
        .from('workouts')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.log('⚠️  Tables exist but query failed:', testError.message);
        console.log('This might be a permissions issue.');
      } else {
        console.log('✅ Database queries working correctly!');
      }
      
    } else {
      console.log('❌ Missing tables:', missingTables.join(', '));
      console.log('\n📋 To fix this, run the SQL migration:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Open SQL Editor');
      console.log('3. Copy and paste the contents of:');
      console.log('   supabase/migrations/20250101000003_create_workout_tracker_tables_safe.sql');
      console.log('4. Run the query');
      
      // Check if migration file exists
      const migrationPath = path.join(__dirname, '../supabase/migrations/20250101000003_create_workout_tracker_tables_safe.sql');
      if (fs.existsSync(migrationPath)) {
        console.log('\n📄 Migration file found at:', migrationPath);
      } else {
        console.log('\n⚠️  Migration file not found. Creating basic tables...');
        await createBasicTables();
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function createBasicTables() {
  console.log('🛠️  Creating basic workout tables...');
  
  const sql = `
    -- Create basic workout tables
    CREATE TABLE IF NOT EXISTS workouts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      date date NOT NULL,
      is_completed boolean DEFAULT false,
      name text,
      notes text,
      created_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
      name text NOT NULL,
      sets integer NOT NULL DEFAULT 1,
      reps integer NOT NULL DEFAULT 1,
      weight numeric NOT NULL DEFAULT 0,
      volume numeric GENERATED ALWAYS AS (sets * reps * weight) STORED,
      notes text,
      order_index integer DEFAULT 0,
      created_at timestamp with time zone DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

    -- Basic policies
    CREATE POLICY IF NOT EXISTS "Users can manage their own workouts" ON workouts
      FOR ALL USING (auth.uid() = user_id);
      
    CREATE POLICY IF NOT EXISTS "Users can manage their own workout exercises" ON workout_exercises
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM workouts 
          WHERE workouts.id = workout_exercises.workout_id 
          AND workouts.user_id = auth.uid()
        )
      );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('❌ Failed to create tables:', error.message);
    } else {
      console.log('✅ Basic tables created successfully!');
    }
  } catch (error) {
    console.log('⚠️  Could not auto-create tables. Please run the migration manually.');
  }
}

// Run the check
checkTables(); 
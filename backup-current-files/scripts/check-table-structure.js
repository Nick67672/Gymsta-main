const { createClient } = require('@supabase/supabase-js');

// Use values from eas.json
const supabaseUrl = 'https://gwcdrwlwvufdubnknyyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Y2Ryd2x3dnVmZHVibmtueXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODAzMzAsImV4cCI6MjA1OTk1NjMzMH0.DIEa0TttW1UdRCUywkljuGZibDnVd1Z7C3ZUwJ_7NSE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('Checking workouts table structure...');
    
    // Try to get table structure by querying information_schema
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'workouts')
      .order('ordinal_position');

    if (error) {
      console.error('Error querying table structure:', error);
      
      // Alternative approach - try to select with all expected columns
      console.log('Trying alternative approach - testing column existence...');
      
      const testColumns = [
        'id',
        'user_id', 
        'date',
        'is_completed',
        'name',
        'notes',
        'tags',
        'created_at',
        'updated_at'
      ];
      
      for (const column of testColumns) {
        try {
          const { data: testData, error: testError } = await supabase
            .from('workouts')
            .select(column)
            .limit(1);
            
          if (testError) {
            console.log(`❌ Column '${column}' - ERROR: ${testError.message}`);
          } else {
            console.log(`✅ Column '${column}' - EXISTS`);
          }
        } catch (e) {
          console.log(`❌ Column '${column}' - FAILED: ${e.message}`);
        }
      }
      
    } else {
      console.log('✅ Table structure retrieved successfully:');
      console.log('Current columns:');
      data.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Check for missing columns
      const expectedColumns = ['id', 'user_id', 'date', 'is_completed', 'name', 'notes', 'tags', 'created_at', 'updated_at'];
      const existingColumns = data.map(col => col.column_name);
      const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('\n❌ Missing columns:');
        missingColumns.forEach(col => console.log(`  - ${col}`));
        
        console.log('\n📋 SQL to add missing columns:');
        missingColumns.forEach(col => {
          let sql = '';
          switch(col) {
            case 'is_completed':
              sql = 'ALTER TABLE workouts ADD COLUMN is_completed boolean DEFAULT false;';
              break;
            case 'name':
              sql = 'ALTER TABLE workouts ADD COLUMN name text;';
              break;
            case 'notes':
              sql = 'ALTER TABLE workouts ADD COLUMN notes text;';
              break;
            case 'tags':
              sql = 'ALTER TABLE workouts ADD COLUMN tags text[];';
              break;
            case 'created_at':
              sql = 'ALTER TABLE workouts ADD COLUMN created_at timestamp with time zone DEFAULT now();';
              break;
            case 'updated_at':
              sql = 'ALTER TABLE workouts ADD COLUMN updated_at timestamp with time zone DEFAULT now();';
              break;
          }
          if (sql) console.log(`  ${sql}`);
        });
        
        console.log('\n💡 You can run these SQL commands in the Supabase SQL editor at:');
        console.log('   https://supabase.com/dashboard/project/gwcdrwlwvufdubnknyyk/sql');
        
      } else {
        console.log('\n✅ All expected columns are present!');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTableStructure(); 
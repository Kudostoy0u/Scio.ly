#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  // Use the same URL as the application
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('✅ Supabase client created');
  
  // Test each table
  const tables = [
    'new_team_groups',
    'new_team_units', 
    'new_team_memberships',
    'new_team_posts',
    'new_team_events',
    'new_team_assignments',
    'new_team_materials'
  ];
  
  for (const table of tables) {
    try {
      console.log(`\n🔍 Testing table: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
        
      if (error) {
        console.error(`❌ ${table}: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        console.error(`   Details: ${error.details}`);
        console.error(`   Hint: ${error.hint}`);
      } else {
        console.log(`✅ ${table}: OK`);
      }
    } catch (err) {
      console.error(`❌ ${table}: Exception - ${err.message}`);
    }
  }
  
  // Test relationships
  console.log('\n🔍 Testing relationships...');
  
  try {
    const { data, error } = await supabase
      .from('new_team_memberships')
      .select(`
        *,
        new_team_units(
          *,
          new_team_groups(*)
        )
      `)
      .limit(1);
      
    if (error) {
      console.error(`❌ Relationship test failed: ${error.message}`);
      console.error(`   Code: ${error.code}`);
    } else {
      console.log(`✅ Relationship test: OK`);
    }
  } catch (err) {
    console.error(`❌ Relationship test exception: ${err.message}`);
  }
  
  console.log('\n🏁 Database test completed');
}

testDatabase().catch(console.error);

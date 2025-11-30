#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

async function testDatabase() {
  // Use the same URL as the application
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseKey)) {
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test each table
  const tables = [
    "new_team_groups",
    "new_team_units",
    "new_team_memberships",
    "new_team_posts",
    "new_team_events",
    "new_team_assignments",
    "new_team_materials",
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("count").limit(1);

      if (error) {
      } else {
      }
    } catch (_err) {}
  }

  try {
    const { data, error } = await supabase
      .from("new_team_memberships")
      .select(`
        *,
        new_team_units(
          *,
          new_team_groups(*)
        )
      `)
      .limit(1);

    if (error) {
    } else {
    }
  } catch (_err) {}
}

testDatabase().catch(console.error);

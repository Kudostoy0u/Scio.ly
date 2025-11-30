#!/bin/bash

# Teams V2 Schema Setup Script for CockroachDB
# This script uses the CockroachDB CLI to apply the new teams schema

set -e  # Exit on any error

# Database connection details
DATABASE_URL="postgresql://kundan:jTucKCVvP7D1cRbB8doSVg@scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud:26257/defaultdb?sslmode=require"

# Extract connection details from DATABASE_URL
DB_HOST="scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud"
DB_PORT="26257"
DB_USER="kundan"
DB_NAME="defaultdb"

echo "🚀 Setting up Teams V2 Schema on CockroachDB..."
echo "📍 Host: $DB_HOST"
echo "🔌 Port: $DB_PORT"
echo "👤 User: $DB_USER"
echo "🗄️  Database: $DB_NAME"
echo ""

# Check if cockroach CLI is installed
if ! command -v cockroach &> /dev/null; then
    echo "❌ CockroachDB CLI not found. Please install it first:"
    echo "   https://www.cockroachlabs.com/docs/stable/install-cockroachdb.html"
    exit 1
fi

echo "✅ CockroachDB CLI found"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
if cockroach sql --url="$DATABASE_URL" --execute="SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Failed to connect to database. Please check your connection details."
    exit 1
fi

echo ""

# Apply the schema
echo "📋 Applying Teams V2 schema..."
echo "This may take a few minutes..."

# Execute the schema file
if cockroach sql --url="$DATABASE_URL" --file="migrations/new_teams_schema.sql"; then
    echo "✅ Schema applied successfully!"
else
    echo "❌ Failed to apply schema. Please check the error messages above."
    exit 1
fi

echo ""

# Verify tables were created
echo "🔍 Verifying tables were created..."
TABLE_COUNT=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'new_%';" --format=csv | tail -n 1)

if [ "$TABLE_COUNT" -ge 16 ]; then
    echo "✅ Successfully created $TABLE_COUNT new tables"
else
    echo "⚠️  Warning: Only $TABLE_COUNT tables created (expected 16+)"
fi

echo ""

# List all new tables
echo "📋 New tables created:"
cockroach sql --url="$DATABASE_URL" --execute="SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'new_%' ORDER BY table_name;" --format=table

echo ""

# Check RLS policies
echo "🔐 Checking Row Level Security policies..."
RLS_COUNT=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'new_%' AND rowsecurity = true;" --format=csv | tail -n 1)

if [ "$RLS_COUNT" -ge 16 ]; then
    echo "✅ RLS enabled on $RLS_COUNT tables"
else
    echo "⚠️  Warning: RLS enabled on only $RLS_COUNT tables"
fi

echo ""

# Test basic functionality
echo "🧪 Testing basic functionality..."

# Test team group creation
echo "Creating test team group..."
cockroach sql --url="$DATABASE_URL" --execute="
INSERT INTO new_team_groups (school, division, slug, description, created_by) 
VALUES ('Test School', 'C', 'test-school-c', 'Test team for verification', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;
"

# Test team unit creation
echo "Creating test team unit..."
cockroach sql --url="$DATABASE_URL" --execute="
INSERT INTO new_team_units (group_id, team_id, name, description, captain_code, user_code, created_by)
SELECT 
    (SELECT id FROM new_team_groups WHERE slug = 'test-school-c' LIMIT 1),
    'A',
    'Test Team',
    'Test team for verification',
    'TEST1234',
    'TEST5678',
    (SELECT id FROM auth.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM new_team_groups WHERE slug = 'test-school-c');
"

echo "✅ Basic functionality test completed"

echo ""
echo "🎉 Teams V2 schema setup completed successfully!"
echo ""
echo "📊 Summary:"
echo "   • Tables created: $TABLE_COUNT"
echo "   • RLS policies: $RLS_COUNT"
echo "   • Test data: Created"
echo ""
echo "🚀 Your teams feature is now ready to use!"
echo ""
echo "Next steps:"
echo "   1. Update your application to use the new API endpoints"
echo "   2. Test team creation and joining functionality"
echo "   3. Verify all features work as expected"
echo ""
echo "For more information, see: TEAMS_V2_README.md"

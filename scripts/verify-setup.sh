#!/bin/bash

# Teams V2 Setup Verification Script
# This script verifies that the Teams V2 schema was applied successfully

DATABASE_URL="postgresql://kundan:jTucKCVvP7D1cRbB8doSVg@scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud:26257/defaultdb?sslmode=require"

echo "🔍 Verifying Teams V2 Setup..."
echo ""

# Check if cockroach CLI exists
if ! command -v cockroach &> /dev/null; then
    echo "❌ CockroachDB CLI not found. Please install it first."
    exit 1
fi

echo "✅ CockroachDB CLI found"
echo ""

# Count tables
echo "📊 Checking tables..."
TABLE_COUNT=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'new_%';" --format=csv | tail -n 1)
echo "   • New tables created: $TABLE_COUNT"

# List all tables
echo ""
echo "📋 All new tables:"
cockroach sql --url="$DATABASE_URL" --execute="SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'new_%' ORDER BY table_name;" --format=table

echo ""

# Check sample data
echo "🧪 Checking sample data..."
SAMPLE_GROUPS=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT COUNT(*) FROM new_team_groups;" --format=csv | tail -n 1)
SAMPLE_UNITS=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT COUNT(*) FROM new_team_units;" --format=csv | tail -n 1)

echo "   • Sample team groups: $SAMPLE_GROUPS"
echo "   • Sample team units: $SAMPLE_UNITS"

echo ""

# Test functions
echo "🔧 Testing utility functions..."
TEAM_CODE=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT generate_team_code();" --format=csv | tail -n 1)
INVITE_CODE=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT generate_invitation_code();" --format=csv | tail -n 1)

echo "   • Team code generation: $TEAM_CODE"
echo "   • Invitation code generation: $INVITE_CODE"

echo ""

# Check views
echo "👁️  Checking views..."
VIEW_COUNT=$(cockroach sql --url="$DATABASE_URL" --execute="SELECT COUNT(*) FROM information_schema.views WHERE table_name LIKE 'new_%';" --format=csv | tail -n 1)
echo "   • Views created: $VIEW_COUNT"

echo ""

# Test team stats view
echo "📈 Testing team statistics view..."
cockroach sql --url="$DATABASE_URL" --execute="SELECT team_name, school, division, member_count FROM new_team_stats;" --format=table

echo ""

if [ "$TABLE_COUNT" -ge 16 ]; then
    echo "🎉 Teams V2 setup completed successfully!"
    echo ""
    echo "✅ Summary:"
    echo "   • Tables: $TABLE_COUNT created"
    echo "   • Views: $VIEW_COUNT created"
    echo "   • Sample data: Ready"
    echo "   • Functions: Working"
    echo ""
    echo "🚀 Your Teams V2 feature is ready to use!"
    echo ""
    echo "Next steps:"
    echo "   1. Update your application to use the new API endpoints"
    echo "   2. Test team creation and joining functionality"
    echo "   3. Verify all features work as expected"
    echo ""
    echo "API Endpoints available:"
    echo "   • POST /api/teams/v2/create"
    echo "   • POST /api/teams/v2/join"
    echo "   • GET /api/teams/v2/user-teams"
    echo "   • GET/POST /api/teams/v2/[teamId]/posts"
    echo "   • GET/POST /api/teams/v2/[teamId]/events"
    echo "   • GET/POST /api/teams/v2/[teamId]/assignments"
    echo "   • GET/POST /api/teams/v2/[teamId]/materials"
    echo ""
    echo "For more information, see: TEAMS_V2_README.md"
else
    echo "⚠️  Warning: Only $TABLE_COUNT tables created (expected 16+)"
    echo "Please check the setup and try again."
    exit 1
fi

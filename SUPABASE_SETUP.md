# Supabase Migration Setup

This project has been successfully migrated from Firebase to Supabase. Here's how to set up and use the new database.

## Database Setup

### 1. Run the SQL Migration

In your Supabase project dashboard, go to the SQL Editor and run the migration script located at:
```
migrations/001_initial_schema.sql
```

This will create all necessary tables, indexes, RLS policies, and functions.

### 2. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Enable Google provider:
   - Go to Auth > Settings > Authentication Providers
   - Enable Google provider
   - Add your Google OAuth credentials

### 3. Database Tables Created

- **users**: User profiles with navbar preferences and unlock flags
- **user_stats**: Daily statistics tracking (questions attempted, correct answers, events practiced, game points)
- **bookmarks**: User bookmarked questions
- **game_points**: Game point transaction history

## Features Implemented

### Statistics Tracking
- Daily, weekly, and monthly aggregations
- Questions attempted and correct answers
- Events practiced tracking
- Game points system with transaction history

### User Management
- Automatic user profile creation on signup
- Navbar style preferences (default, golden, rainbow)
- Achievement unlock tracking

### Bookmarks System
- Save/remove questions by event
- Support for multiple question sources
- Automatic cleanup with user deletion

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic data cleanup when users are deleted

## Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qzwdlqeicmcaoggdavdm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d2RscWVpY21jYW9nZ2RhdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjQ1MTQsImV4cCI6MjA2OTY0MDUxNH0.-b8RDZFGrJekuDCTQtXayaozxyfwoOV4RLf_jOORYkk
```

## Key Changes Made

### Authentication
- Replaced Firebase Auth with Supabase Auth
- Updated OAuth flow to use Supabase Google provider
- Changed user property access (uid → id, displayName → user_metadata.name)

### Database Operations
- Replaced Firestore with Supabase PostgreSQL
- Converted Firebase collections to PostgreSQL tables
- Updated all CRUD operations to use Supabase client

### Utilities Updated
- `userProfile.ts`: User preferences and achievement tracking
- `metrics.ts`: Statistics with daily/weekly/monthly aggregations
- `bookmarks.ts`: Question bookmarking system
- `gamepoints.ts`: Game points with transaction history

### Components Updated
- `AuthButton.tsx`: Supabase OAuth integration
- All content pages: Updated auth state management
- Bookmark manager: Updated to use Supabase bookmarks

## Database Functions

### get_user_stats_summary()
Gets aggregated statistics for a user over different time periods:
```sql
SELECT * FROM get_user_stats_summary('user-id', 'daily');   -- Today
SELECT * FROM get_user_stats_summary('user-id', 'weekly');  -- Last 7 days
SELECT * FROM get_user_stats_summary('user-id', 'monthly'); -- Last 30 days
```

## Migration Notes

- All Firebase functionality has been preserved
- Enhanced with better statistics tracking
- Added game points transaction history
- Improved data relationships with foreign keys
- Better performance with PostgreSQL indexes

The application is now ready to use with Supabase!
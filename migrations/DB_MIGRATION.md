# Database Migration: Neon to CockroachDB

## Overview

This project has been migrated from Neon database to CockroachDB using Drizzle ORM with PostgreSQL driver and connection pooling for optimal scalability.

## Changes Made

### 1. Dependencies Updated
- Removed: `@neondatabase/serverless`
- Added: PostgreSQL driver with connection pooling
- Kept: `drizzle-orm` and `drizzle-kit` for ORM functionality

### 2. Database Schema
- **Location**: `src/lib/db/schema.ts`
- **Tables**: 
  - `bookmarks` - User bookmarks for questions
  - `game_points` - Game points earned by users
  - `user_stats` - Daily user statistics
  - `questions` - Science Olympiad questions
  - `quotes` - Quotes for Codebusters cipher tests
- **Excluded**: Users and leaderboards (delegated to Supabase)

### 3. Connection Configuration
- **File**: `src/lib/db/index.ts`
- **Features**:
  - Connection pooling (max 20 connections)
  - Idle timeout (20 seconds)
  - Connection timeout (10 seconds)
  - SSL support for CockroachDB (always enabled)
  - Prepared statements enabled
  - Connection lifetime management (30 minutes)

### 4. Database Utilities
- **File**: `src/lib/db/utils.ts`
- **Functions**: CRUD operations for bookmarks, game points, user stats, and quotes
- **Features**: Type-safe operations with Drizzle ORM

### 5. API Routes Updated
- **File**: `src/app/api/questions/route.ts`
- **Changes**: Migrated from deprecated `executeQuery` to Drizzle ORM
- **Features**: Type-safe queries with better performance

### 6. Quotes API Migration
- **File**: `src/app/api/codebusters/share/route.ts`
- **Changes**: Migrated from Redis KV to CockroachDB for quotes loading
- **Features**: Better performance and data consistency
- **Fix**: Added support for new indices format `[{index: number, language: string}]`
- **Enhancement**: Implemented random quote selection instead of deterministic indices

- **File**: `src/app/api/quotes/route.ts`
- **Changes**: Migrated from Redis KV to CockroachDB for quotes API
- **Features**: Direct database access with better reliability

### 7. Type Definitions
- **File**: `src/lib/db/types.ts`
- **Features**: Inferred types from schema + custom API response types

## Configuration

### Environment Variables
```env
DATABASE_URL=your_cockroachdb_connection_string
```

### Drizzle Configuration
```typescript
// drizzle.config.ts
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Usage

### Basic Database Operations
```typescript
import { db } from '@/lib/db';
import { bookmarks, gamePoints, userStats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Query bookmarks
const userBookmarks = await db
  .select()
  .from(bookmarks)
  .where(eq(bookmarks.userId, userId));

// Insert game points
await db.insert(gamePoints).values({
  userId: 'user-id',
  points: 100,
  source: 'practice',
  description: 'Completed practice session'
});
```

### Using Utility Functions
```typescript
import { 
  createBookmark, 
  getBookmarksByUserId, 
  createGamePoint 
} from '@/lib/db/utils';

// Create bookmark
await createBookmark({
  userId: 'user-id',
  questionData: { /* question data */ },
  eventName: 'Anatomy',
  source: 'practice'
});

// Get user bookmarks
const bookmarks = await getBookmarksByUserId('user-id');
```

## Migration Commands

```bash
# Generate new migration
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

## Best Practices

### Connection Pooling
- Maximum 20 connections per pool
- Idle connections closed after 20 seconds
- Connection lifetime limited to 30 minutes
- Prepared statements enabled for performance

### Type Safety
- All database operations are type-safe
- Use Drizzle ORM instead of raw SQL when possible
- Leverage inferred types from schema

### Error Handling
- Connection testing available via `testConnection()`
- Graceful connection pool closure via `closeConnection()`
- Comprehensive error logging

## Performance Optimizations

1. **Connection Pooling**: Efficient connection reuse
2. **Prepared Statements**: Better query performance
3. **Type Safety**: Compile-time error checking
4. **Connection Limits**: Prevents connection exhaustion
5. **Idle Timeout**: Frees unused connections

## Monitoring

- Connection pool status available via client
- Query performance can be monitored through Drizzle
- Error logging for failed connections and queries

## Notes

- Users and leaderboards are handled by Supabase (separate system)
- Legacy `executeQuery` function maintained for backward compatibility
- All new code should use Drizzle ORM directly
- Connection string should point to CockroachDB instance
- SSL is always enabled for CockroachDB connections
- API routes have been updated to use Drizzle ORM for better performance
- All quotes now loaded from database instead of Redis KV
- Codebusters share codes now properly handle new indices format with language support
- Codebusters now randomly selects quotes for variety instead of using fixed indices 
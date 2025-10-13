# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scio.ly is a comprehensive Science Olympiad practice platform built with Next.js, providing over 3000 questions across 24 Division C events. The platform features AI-powered explanations (Gemini 2.0), test sharing, progress tracking, and multiple study modes.

## Development Commands

### Essential Commands
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Production build
- `pnpm start` - Start production server
- `pnpm lint` - Lint src/app and src/lib directories
- `pnpm typecheck` - Type check without emitting files

### Testing
- `pnpm test` - Run tests once with Vitest
- `pnpm test:ui` - Run tests in interactive UI mode
- Tests are located in `src/**/*.test.{ts,tsx}` alongside the code they test

### Database Operations
- `pnpm db:generate` - Generate Drizzle schema migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio for database inspection
- `pnpm db:init` - Initialize database with tables (uses scripts/init-db.js)

### Analysis Tools
- `pnpm analyze:long` - Find long files in the codebase
- `pnpm analyze:long:json` - Output long files analysis as JSON

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: PostgreSQL (CockroachDB) via Drizzle ORM
- **Authentication**: Supabase with Google OAuth
- **AI**: Google Gemini 2.0 (explanations, grading)
- **Styling**: Tailwind CSS
- **Testing**: Vitest with React Testing Library
- **Package Manager**: pnpm

### Key Directory Structure

```
src/
├── app/                    # Next.js App Router pages and routes
│   ├── api/               # API routes (contact, assignments, gemini, admin, etc.)
│   ├── test/              # Test-taking interface and logic
│   ├── unlimited/         # Unlimited practice mode
│   ├── dashboard/         # User dashboard
│   ├── teams/             # Team management
│   ├── plagiarism/        # Plagiarism detection tools
│   ├── codebusters/       # Codebusters-specific features
│   ├── contexts/          # React contexts (Auth, Theme, Notifications)
│   ├── components/        # Shared React components
│   └── utils/             # App-level utilities
├── lib/
│   ├── db/                # Database schema and utilities
│   │   ├── schema.ts      # Drizzle schema definitions
│   │   ├── teams.ts       # Team management database logic
│   │   └── notifications.ts
│   ├── services/          # External service integrations
│   │   └── gemini.ts      # Gemini AI service wrapper
│   ├── utils/             # Shared utilities (base52, grade, markdown, string, etc.)
│   ├── supabase.ts        # Client-side Supabase client
│   └── supabaseServer.ts  # Server-side Supabase client
├── docs/                  # Science Olympiad event rules (markdown)
└──
```

### Database Schema (Drizzle ORM)

Key tables defined in `src/lib/db/schema.ts`:
- **questions** - Science Olympiad questions (MCQ/FRQ) with metadata
- **idEvents** - ID-based events (with images, pure identification)
- **shareLinks** - Test sharing codes with expiration
- **teams** - Team data with captain/user codes
- **edits** - Question edit history
- **blacklists** - Blacklisted questions
- **quotes/longquotes** - Codebusters practice quotes
- **base52Codes** - Short codes for question references

**Database Connection:**
- For Drizzle ORM: Use `db` from `@/lib/db/index`
- For legacy pg queries: Use `pool` from `@/lib/db/pool`
- Connection pool is centralized and configured with proper limits

### Authentication Flow

The app uses Supabase for authentication with two client types:
- **Client-side**: `src/lib/supabase.ts` - Browser-based operations
- **Server-side**: `src/lib/supabaseServer.ts` - Server components and API routes

AuthContext (`src/app/contexts/AuthContext.tsx`) provides user state throughout the app.

### AI Integration (Gemini)

The GeminiService class (`src/lib/services/gemini.ts`) handles:
- API key rotation across multiple keys (from GEMINI_API_KEYS env var)
- Question explanations
- Free response grading
- Question analysis and validation
- Edit suggestions

API routes in `src/app/api/gemini/` expose these features.

### Test System

The test-taking system (`src/app/test/`) supports:
- **Timed tests** with competition simulation
- **Unlimited practice** with difficulty filtering (`src/app/unlimited/`)
- **Shared tests** via unique codes (`shareLinks` table)
- **Print functionality** for offline use (`src/app/test/utils/print/`)
- Both MCQ and FRQ question types
- ID-based events with image support

### Team Sharing

Teams system (`src/lib/db/teams.ts`, `src/app/teams/`) enables:
- Team captains generate access codes (captain/user permissions)
- 24-hour code expiration
- Team roster management
- Assignment distribution (see `src/app/api/assignments/`)

See `TEAM_SHARING.md` for detailed schema and features.

### Important Patterns

1. **Path Alias**: Use `@/*` to import from `src/` (e.g., `import { X } from '@/lib/utils/string'`)

2. **Environment Variables**: Required env vars (not in repo):
   - `DATABASE_URL` - PostgreSQL connection string (REQUIRED)
   - `GEMINI_API_KEYS` - Comma-separated Gemini API keys
   - `PGSSLROOTCERT` - Base64-encoded CA certificate for SSL
   - Supabase credentials (URL, anon key, service role key)

3. **Database Access**:
   - **NEVER** create new Pool instances directly
   - Use `import { pool } from '@/lib/db/pool'` for pg-based queries
   - Use `import { db } from '@/lib/db/index'` for Drizzle ORM
   - Pool is configured with proper limits and graceful shutdown

4. **Client vs Server Components**:
   - Use `'use client'` directive for components with hooks/interactivity
   - Server components for data fetching and API calls
   - Contexts (Auth, Theme, Notifications) are client-side

5. **Testing**: Tests are colocated with source files (e.g., `base52.test.ts` next to `base52.ts`)

6. **Logging**:
   - **ALWAYS** use `logger` from `@/lib/utils/logger`
   - **NEVER** use `console.log/warn/error` directly
   - Development: All logs shown
   - Production: Only warnings and errors
   - Test: All logs suppressed

7. **Error Handling**:
   - Throw descriptive errors with context
   - Use `instanceof Error` checks
   - Return proper HTTP status codes in API routes
   - Never expose sensitive information in errors

8. **Random Ordering**: Database tables use `randomF` (random float) column for shuffling questions

9. **ESLint**: Ignores `.next/`, allows `any` types, warns on unused vars (except `_` prefix)

## Common Workflows

### Adding a New Question Type
1. Update `src/lib/db/schema.ts` if new fields needed
2. Add question fetching logic in appropriate route
3. Update question card rendering in `src/app/test/components/QuestionCard.tsx`
4. Handle grading in `src/lib/utils/grade.ts` or AI grading routes

### Adding a New Event
1. Add event rules to `src/docs/division_c_rules/`
2. Update question database with event-specific questions
3. Configure event metadata (subtopics, difficulty)

### Modifying AI Features
1. Update GeminiService methods in `src/lib/services/gemini.ts`
2. Create/modify API routes in `src/app/api/gemini/`
3. Test with multiple API keys to ensure rotation works

### Database Changes
1. Modify schema in `src/lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply migration
4. Use `pnpm db:studio` to inspect changes

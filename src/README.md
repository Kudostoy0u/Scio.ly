# Source Directory

This directory contains the source code for the Scio.ly platform, organized into application code, library code, documentation, and test utilities.

## Directory Structure

### `app/`
Next.js 15 App Router application code. Contains all routes, pages, API endpoints, components, and application-specific utilities.

**Key Features:**
- Route-based file organization
- Server and client components
- API routes for backend functionality
- Shared components and contexts
- Application utilities

See [app/README.md](./app/README.md) for detailed documentation.

### `lib/`
Core business logic, utilities, and shared services. Contains database management, API utilities, services, and utility functions.

**Key Features:**
- Database schema and operations (Drizzle ORM)
- API utilities (auth, rate limiting)
- Services (Gemini AI, caching)
- Shared utilities and types
- TRPC setup

See [lib/README.md](./lib/README.md) for detailed documentation.

### `components/`
Shared React components used across the application (currently empty, components are in `app/components/`).

### `docs/`
Documentation content for Science Olympiad events.

**Key Features:**
- Division B rules (36 markdown files)
- Division C rules (36 markdown files)
- Event-specific documentation

### `test-utils/`
Testing utilities and test providers for the test suite.

**Files:**
- `index.tsx` - Test utilities exports
- `test-providers.tsx` - React providers for testing
- `README.md` - Test utilities documentation

## Important Notes

1. **App Router**: Uses Next.js 15 App Router with server and client components
2. **Type Safety**: Full TypeScript support throughout
3. **Database**: Uses Drizzle ORM with PostgreSQL (Supabase) and CockroachDB
4. **Authentication**: Supabase Auth integration
5. **AI Integration**: Google Gemini 2.0 for explanations and grading
6. **Testing**: Vitest for unit and integration tests


# Teams Feature Refactoring Status

This document tracks the refactoring progress for making the teams feature production-ready.

## Completed Work ✅

### 1. Raw SQL to Drizzle ORM Migration

**Completed Routes:**
- ✅ `GET /api/teams/[teamId]/assignments` - Replaced `sql` template with `inArray()` and `ne()`
- ✅ `POST /api/teams/[teamId]/assignments` - Replaced `sql` template with `ne()`
- ✅ `POST /api/teams/[teamId]/subteams/[subteamId]/assignments` - Replaced `sql` template with `ne()`
- ✅ `POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters` - Replaced `sql` template with `ne()`
- ✅ `src/lib/trpc/routers/teams.ts` - Replaced `sql` template with `isNotNull()`

**Changes Made:**
- Replaced `sql`${newTeamMemberships.userId} != ${user.id}`` with `ne(newTeamMemberships.userId, user.id)`
- Replaced `sql`${newTeamAssignmentSubmissions.status} IN ('submitted', 'graded')`` with `inArray(newTeamAssignmentSubmissions.status, ["submitted", "graded"])`
- Replaced `sql`${newTeamRosterData.userId} IS NOT NULL`` with `isNotNull(newTeamRosterData.userId)`

### 2. Centralized Schema

**Completed:**
- ✅ Added missing schema definitions to `src/lib/db/schema/teams.ts`:
  - `newTeamEvents` - Calendar events
  - `newTeamRemovedEvents` - Removed events from conflict blocks
  - `newTeamStreamPosts` - Stream posts
  - `newTeamStreamComments` - Stream comments
  - `newTeamActiveTimers` - Active countdown timers
  - `newTeamRecurringMeetings` - Recurring meeting definitions
- ✅ All routes import from `@/lib/db/schema` (centralized)
- ✅ Schema documentation created in `SCHEMA.md`

### 3. Documentation

**Created:**
- ✅ `src/app/teams/docs/README.md` - Documentation index
- ✅ `src/app/teams/docs/SCHEMA.md` - Complete database schema reference
- ✅ `src/app/teams/docs/API_ROUTES.md` - Detailed API route documentation with business logic flows
- ✅ `src/app/teams/docs/BUSINESS_LOGIC.md` - High-level business logic and workflows
- ✅ `src/app/teams/docs/REFACTORING_STATUS.md` - This file

## Pending Work ⚠️

### 1. Raw SQL Migration (High Priority)

**Routes Still Using `queryCockroachDB` (Raw SQL):**

1. **Roster Routes:**
   - `GET /api/teams/[teamId]/roster` - Uses `queryCockroachDB` for group lookup and removed events
   - `POST /api/teams/[teamId]/roster` - Uses `queryCockroachDB` for group lookup, subteam verification, member lookup, and upsert

2. **Stream Routes:**
   - `GET /api/teams/[teamId]/stream` - Uses `queryCockroachDB` for group lookup and stream posts
   - `POST /api/teams/[teamId]/stream` - Uses `queryCockroachDB` for group lookup, membership check, and post creation
   - `PUT /api/teams/[teamId]/stream` - Uses `queryCockroachDB` for updates
   - `DELETE /api/teams/[teamId]/stream` - Uses `queryCockroachDB` for deletion
   - `GET /api/teams/[teamId]/stream/comments` - Uses `queryCockroachDB`
   - `POST /api/teams/[teamId]/stream/comments` - Uses `queryCockroachDB`
   - `DELETE /api/teams/[teamId]/stream/comments` - Uses `queryCockroachDB`

3. **Calendar Routes:**
   - `GET /api/teams/calendar/events` - Uses `queryCockroachDB`
   - `POST /api/teams/calendar/events` - Uses `queryCockroachDB`
   - `GET /api/teams/calendar/events/[eventId]` - Uses `queryCockroachDB`
   - `PUT /api/teams/calendar/events/[eventId]` - Uses `queryCockroachDB`
   - `DELETE /api/teams/calendar/events/[eventId]` - Uses `queryCockroachDB`
   - `GET /api/teams/calendar/recurring-meetings` - Uses `queryCockroachDB`
   - `POST /api/teams/calendar/recurring-meetings` - Uses `queryCockroachDB`
   - `PUT /api/teams/calendar/recurring-meetings` - Uses `queryCockroachDB`
   - `DELETE /api/teams/calendar/recurring-meetings` - Uses `queryCockroachDB`

4. **Timer Routes:**
   - `GET /api/teams/[teamId]/timers` - Uses `queryCockroachDB`
   - `POST /api/teams/[teamId]/timers` - Uses `queryCockroachDB`
   - `DELETE /api/teams/[teamId]/timers` - Uses `queryCockroachDB`

5. **Invite Routes:**
   - `POST /api/teams/[teamId]/invite` - Uses `queryCockroachDB` for membership checks and user lookup
   - `POST /api/teams/[teamId]/invite/cancel` - Uses `queryCockroachDB`

6. **Other Routes:**
   - `GET /api/teams/[teamId]/tournaments` - Uses `queryCockroachDB`
   - `GET /api/teams/[teamId]/subteams/[subteamId]` - Uses `queryCockroachDB`
   - `PUT /api/teams/[teamId]/subteams/[subteamId]` - Uses `queryCockroachDB`
   - `DELETE /api/teams/[teamId]/subteams/[subteamId]` - Uses `queryCockroachDB` (many DELETE statements)
   - `GET /api/teams/notifications` - Uses `queryCockroachDB`
   - `POST /api/teams/notifications` - Uses `queryCockroachDB`
   - Various roster invitation routes

**Migration Strategy:**
1. Replace `queryCockroachDB` calls with Drizzle ORM queries
2. Use `dbPg` instance from `@/lib/db`
3. Import schema from `@/lib/db/schema`
4. Use Drizzle operators: `eq()`, `and()`, `or()`, `inArray()`, `ne()`, `isNotNull()`, `isNull()`, etc.
5. For complex queries, use joins: `.innerJoin()`, `.leftJoin()`
6. For upserts, use `.onConflictDoUpdate()`

### 2. Error Handling Improvements

**Issues:**
- Some routes catch errors but don't log them properly
- Error messages sometimes expose internal details
- Inconsistent error response formats

**Recommendations:**
- Use consistent error response format: `{ error: string, details?: string }`
- Log errors with context using logger
- Don't expose database errors to clients
- Return appropriate HTTP status codes

### 3. Input Validation

**Issues:**
- Some routes don't validate UUID formats
- Some routes don't validate required fields consistently
- Missing Zod schemas for some routes

**Recommendations:**
- Use Zod schemas for all request bodies
- Validate UUID formats consistently
- Validate enum values (roles, statuses, etc.)
- Return 400 with clear error messages for validation failures

### 4. Code Organization

**Issues:**
- Some routes have duplicate logic (team slug resolution, access checks)
- Some utility functions could be better organized
- Mixed patterns for error handling

**Recommendations:**
- Extract common patterns into utility functions
- Create middleware for common operations (auth, team resolution, access checks)
- Standardize response formatting

### 5. Legacy Code Removal

**Issues:**
- Some routes reference legacy tables (`team_groups`, `team_units`, `team_memberships`)
- Some commented-out code should be removed
- Some unused imports

**Recommendations:**
- Remove references to legacy tables (if not needed)
- Clean up commented code
- Remove unused imports
- Update any remaining legacy patterns

## Production Readiness Checklist

### Code Quality
- [x] Centralized schema definitions
- [x] Documentation created
- [ ] All raw SQL replaced with Drizzle ORM
- [ ] Consistent error handling
- [ ] Input validation with Zod
- [ ] Proper logging
- [ ] Type safety throughout

### Performance
- [ ] Query optimization (indexes, joins)
- [ ] Caching strategy (if needed)
- [ ] Batch operations where appropriate
- [ ] Connection pooling configured

### Security
- [ ] All routes require authentication
- [ ] Access control checks in place
- [ ] Input sanitization
- [ ] SQL injection prevention (Drizzle ORM helps)
- [ ] Rate limiting (if needed)

### Testing
- [ ] Unit tests for utility functions
- [ ] Integration tests for API routes
- [ ] Test coverage for critical paths
- [ ] Error case testing

## Next Steps

1. **Priority 1: Complete Raw SQL Migration**
   - Start with most-used routes (roster, stream)
   - Migrate calendar routes
   - Migrate remaining routes

2. **Priority 2: Improve Error Handling**
   - Standardize error response format
   - Add proper logging
   - Create error handling utilities

3. **Priority 3: Add Input Validation**
   - Create Zod schemas for all routes
   - Validate UUIDs consistently
   - Validate enums

4. **Priority 4: Code Cleanup**
   - Remove legacy code
   - Extract common patterns
   - Organize utilities

## Notes

- All new code should use Drizzle ORM exclusively
- All new routes should follow the patterns documented in `API_ROUTES.md`
- All schema changes should be documented in `SCHEMA.md`
- All business logic changes should be documented in `BUSINESS_LOGIC.md`


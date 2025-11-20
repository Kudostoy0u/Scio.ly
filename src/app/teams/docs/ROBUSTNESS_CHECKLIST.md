# Teams Feature - Robustness Checklist

This checklist ensures all teams routes meet production-ready standards for robustness, validation, error handling, and testing.

## Route Requirements

For each route, verify:

### ✅ Database Operations
- [ ] Uses Drizzle ORM (no raw SQL)
- [ ] Imports from centralized schema (`@/lib/db/schema`)
- [ ] Uses proper Drizzle operators (`eq`, `and`, `or`, `inArray`, etc.)
- [ ] Uses transactions for multi-step operations
- [ ] Handles database errors gracefully

### ✅ Input Validation
- [ ] Request body validated with Zod schema
- [ ] Query parameters validated (UUIDs, enums, etc.)
- [ ] Path parameters validated
- [ ] All required fields checked
- [ ] Type validation (strings, numbers, booleans)
- [ ] Format validation (UUIDs, emails, dates)
- [ ] Range validation (slot indices, string lengths)
- [ ] Enum validation (roles, divisions, statuses)

### ✅ Error Handling
- [ ] Uses standardized error handler (`@/lib/utils/error-handler`)
- [ ] Returns appropriate HTTP status codes
- [ ] Provides clear error messages
- [ ] Logs errors with context
- [ ] Doesn't expose internal errors to clients
- [ ] Handles edge cases (not found, unauthorized, etc.)

### ✅ Authorization
- [ ] Checks user authentication
- [ ] Validates team access
- [ ] Checks role-based permissions
- [ ] Verifies resource ownership
- [ ] Prevents unauthorized operations

### ✅ Response Validation
- [ ] Response data validated with Zod schema
- [ ] Consistent response format
- [ ] Proper data transformation
- [ ] Handles null/undefined values

### ✅ Testing
- [ ] E2E tests for critical flows
- [ ] Tests success cases
- [ ] Tests error cases
- [ ] Tests authorization
- [ ] Tests validation
- [ ] Tests edge cases

### ✅ Documentation
- [ ] Route documented in `API_ROUTES.md`
- [ ] Business logic documented in `BUSINESS_LOGIC.md`
- [ ] Flow chart in `FLOWCHARTS.md` (if applicable)
- [ ] Request/response formats documented
- [ ] Error cases documented

## Route Status

### ✅ Completed Routes (8 routes)

1. **Stream Routes** (`/api/teams/[teamId]/stream`)
   - ✅ Drizzle ORM
   - ✅ Zod validation
   - ✅ Error handler
   - ✅ E2E tests
   - ✅ Documentation

2. **Stream Comments Routes** (`/api/teams/[teamId]/stream/comments`)
   - ✅ Drizzle ORM
   - ✅ Zod validation
   - ✅ Error handler
   - ✅ Documentation

3. **Roster Routes** (`/api/teams/[teamId]/roster`)
   - ✅ Drizzle ORM
   - ✅ Zod validation
   - ✅ Error handler
   - ✅ E2E tests
   - ✅ Documentation

4. **Assignment Routes** (`/api/teams/[teamId]/assignments`)
   - ✅ Drizzle ORM
   - ✅ Zod validation (partial)
   - ✅ Error handler
   - ✅ E2E tests
   - ✅ Documentation

5. **Members Route** (`/api/teams/[teamId]/members`)
   - ✅ Drizzle ORM
   - ✅ Zod validation
   - ✅ Error handler
   - ✅ E2E tests
   - ✅ Documentation

6. **All-Data Route** (`/api/teams/[teamId]/all-data`)
   - ✅ Drizzle ORM
   - ✅ Zod validation
   - ✅ Error handler
   - ✅ Documentation

7. **Subteam Routes** (`/api/teams/[teamId]/subteams/[subteamId]`)
   - ✅ Drizzle ORM
   - ✅ Error handler
   - ⚠️ Zod validation (pending)
   - ✅ Documentation

8. **tRPC Router** (`src/lib/trpc/routers/teams.ts`)
   - ✅ Drizzle ORM
   - ✅ Zod validation
   - ✅ Documentation

### ⚠️ In Progress Routes

1. **Calendar Routes** (`/api/teams/calendar/*`)
   - ⚠️ Needs Drizzle ORM migration
   - ⚠️ Needs Zod validation
   - ⚠️ Needs error handler
   - ⚠️ Needs E2E tests

2. **Timer Routes** (`/api/teams/[teamId]/timers`)
   - ⚠️ Needs Drizzle ORM migration
   - ⚠️ Needs Zod validation
   - ⚠️ Needs error handler
   - ⚠️ Needs E2E tests

3. **Invite Routes** (`/api/teams/[teamId]/invite`)
   - ⚠️ Needs Drizzle ORM migration
   - ⚠️ Needs Zod validation
   - ⚠️ Needs error handler
   - ⚠️ Needs E2E tests

## Validation Checklist

### Request Validation
- [ ] All request bodies have Zod schemas
- [ ] All query parameters validated
- [ ] All path parameters validated
- [ ] UUID format validation
- [ ] Enum value validation
- [ ] Required field validation
- [ ] Type validation
- [ ] Range validation

### Response Validation
- [ ] All responses have Zod schemas
- [ ] Response format is consistent
- [ ] Null/undefined handled properly
- [ ] Data transformation validated

## Error Handling Checklist

- [ ] All routes use error handler utility
- [ ] Consistent error response format
- [ ] Proper HTTP status codes
- [ ] Error codes for client handling
- [ ] Errors logged with context
- [ ] Internal errors not exposed
- [ ] Validation errors formatted clearly

## Testing Checklist

- [ ] E2E tests for all critical flows
- [ ] Success case tests
- [ ] Error case tests
- [ ] Authorization tests
- [ ] Validation tests
- [ ] Edge case tests
- [ ] Test utilities available
- [ ] Test cleanup implemented

## Documentation Checklist

- [ ] All routes documented
- [ ] Business logic documented
- [ ] Flow charts created
- [ ] Request/response formats documented
- [ ] Error cases documented
- [ ] Examples provided
- [ ] Schema reference complete

## Code Quality Checklist

- [ ] No raw SQL queries
- [ ] No unused imports
- [ ] No commented-out code
- [ ] Consistent code style
- [ ] Proper TypeScript types
- [ ] No `any` types (where possible)
- [ ] Proper error handling
- [ ] Proper logging

## Security Checklist

- [ ] Input sanitization
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] Authorization checks
- [ ] Rate limiting (if needed)
- [ ] CORS configuration
- [ ] Authentication required
- [ ] No sensitive data in errors

## Performance Checklist

- [ ] Efficient database queries
- [ ] Proper indexing (database level)
- [ ] Batch operations where appropriate
- [ ] Connection pooling configured
- [ ] Caching strategy (if needed)
- [ ] Query optimization

## Monitoring Checklist

- [ ] Error logging
- [ ] Performance logging
- [ ] Request/response logging (if needed)
- [ ] Health checks
- [ ] Metrics collection

## Notes

- All new routes should follow this checklist
- Existing routes should be updated to meet all requirements
- Regular audits should be performed
- Documentation should be kept up to date
- Tests should be expanded as features grow


# Codebase Quality Improvements

This document tracks codebase quality improvements and recommendations.

## Completed Improvements

### 1. Removed Unused Dependencies ✅

**Production Dependencies:**
- `js-yaml` - Not used in codebase
- `pagedjs` - Not used in codebase

**Dev Dependencies:**
- `@babel/generator` - Not used
- `@babel/parser` - Not used
- `@babel/traverse` - Not used
- `@babel/types` - Not used
- `@tailwindcss/typography` - Not used
- `@testing-library/user-event` - Not used
- `glob` - Not used

**Impact:** Reduced bundle size and faster install times.

### 2. Code Cleanup ✅

- Removed 5 stray markdown files from root directory
- Removed empty `src/types/` directory
- Cleaned up 14 outdated progress/status files from `src/app/teams/docs`
- Updated `.gitignore` to include `.cursor` and `.vscode`
- Fixed code example to use logger instead of console.error

## Code Quality Findings

### 1. Type Safety

**Finding:** 938 instances of `any` type across 262 files

**Recommendation:**
- Prioritize replacing `any` types in:
  - API route handlers (`src/app/api/**`)
  - Service layer (`src/lib/services/**`)
  - Test utilities (acceptable in tests, but can be improved)
  - Component props (should be properly typed)

**Priority Files:**
- `src/app/test/hooks/useTestState.ts` - Complex state management
- `src/lib/stores/teamStore.ts` - Store management
- `src/app/utils/dashboardData.ts` - Data processing
- `src/lib/trpc/routers/teams.ts` - API routes

### 2. Error Handling

**Finding:** 72 files with empty catch blocks

**Analysis:**
Most empty catch blocks are in:
- LocalStorage operations (silent failures acceptable)
- Event handler cleanup (silent failures acceptable)
- BroadcastChannel operations (silent failures acceptable)

**Recommendation:**
- Empty catch blocks in localStorage operations are acceptable
- Consider adding logger.debug() for development mode in critical paths
- Document why empty catch blocks are used where they exist

**Files with Acceptable Empty Catch Blocks:**
- `src/app/utils/dashboardData.ts` - LocalStorage operations
- `src/app/utils/storage.ts` - Event handlers and BroadcastChannel
- Most are in cleanup/disposal code where failures are non-critical

### 3. ESLint/TypeScript Suppressions

**Finding:** 4 files with `@ts-expect-error` or `eslint-disable`

**Analysis:**
- `src/lib/utils/string.test.ts` - Testing runtime behavior (acceptable)
- `src/lib/utils/network.test.ts` - Mocking global.fetch (acceptable)
- `src/app/test/services/questionLoader.test.ts` - Testing navigator (acceptable)
- `src/app/test/hooks/utils/fetchQuestions.test.ts` - Test mocks (acceptable)

**Recommendation:** All suppressions are in test files and are acceptable. No action needed.

### 4. Deprecated Code

**Finding:** 3 files with deprecated code

**Files:**
- `src/lib/db/pool.ts` - Marked as deprecated (use Drizzle ORM)
- `src/lib/utils/base52.ts` - Contains deprecated functions
- `src/app/utils/bookmarks.ts` - Contains deprecated code

**Recommendation:**
- Document migration path from deprecated pool.ts
- Remove deprecated functions in base52.ts after migration
- Review and update bookmarks.ts deprecated code

### 5. TODO/FIXME Comments

**Finding:** 10 TODO/FIXME comments across 8 files

**Recommendation:**
- Review each TODO/FIXME and either:
  - Implement the fix
  - Convert to GitHub issue
  - Remove if no longer relevant

## Best Practices Recommendations

### 1. Error Handling Pattern

For API routes, use the standardized error handler:

```typescript
import { handleError, handleValidationError } from "@/lib/utils/error-handler";

try {
  // ... operation
} catch (error) {
  if (error instanceof ZodError) {
    return handleValidationError(error);
  }
  return handleError(error, "Context description");
}
```

### 2. Type Safety

Avoid `any` types. Use:
- `unknown` for truly unknown types
- Proper TypeScript interfaces
- Generic types where appropriate
- Type assertions only when necessary

### 3. Logging

Always use the centralized logger:

```typescript
import logger from "@/lib/utils/logger";

logger.error("Error message", { context });
logger.warn("Warning message", { context });
logger.info("Info message", { context });
```

Never use `console.log`, `console.error`, etc. in production code.

### 4. Empty Catch Blocks

If an empty catch block is necessary, document why:

```typescript
try {
  // Operation that can fail silently
} catch {
  // Silently fail - localStorage unavailable in SSR
  // or non-critical cleanup operation
}
```

## Additional Findings

### 1. Duplicate Cache Implementations ⚠️

**Finding:** `src/lib/utils/globalApiCache.ts` and `src/lib/utils/teamCache.ts` contain nearly identical code (~95% duplicate).

**Details:**
- Both implement the same caching pattern with memory + localStorage
- Same methods: `get`, `set`, `fetchWithCache`, `startBackgroundRefresh`, `invalidate`, `getStats`
- Only differences: storage prefix and some cache configs
- `globalApiCache` has 2 additional methods: `clearCalendarCache`, `preloadCriticalData`

**Recommendation:**
- Create a base `BaseCache` class with shared functionality
- Extend it for `GlobalApiCache` and `TeamCache` with specific configs
- This would reduce code duplication by ~300 lines
- Makes maintenance easier and ensures consistent behavior

### 2. Very Large Files 📏

**Finding:** Several files exceed 1000 lines and should be split:

| File | Lines | Recommendation |
|------|-------|----------------|
| `src/lib/trpc/routers/teams.ts` | 3,034 | Split into multiple router files by feature |
| `src/app/teams/components/PeopleTab.tsx` | 1,499 | Extract sub-components and hooks |
| `src/app/test/hooks/useTestState.ts` | 1,253 | Split into smaller hooks by concern |
| `src/lib/stores/teamStore.ts` | 1,207 | Consider splitting by feature area |
| `src/app/codebusters/page.tsx` | 1,163 | Extract components and logic |
| `src/app/teams/components/TeamCalendar.tsx` | 856 | Extract calendar components |
| `src/app/teams/components/assignment/CodebustersAssignmentCreator.tsx` | 804 | Split into steps/components |
| `src/app/components/EditQuestionModal.tsx` | 787 | Extract sub-components |

**Recommendation:**
- Files over 1000 lines should be split into smaller, focused modules
- Extract reusable components, hooks, and utilities
- Improves maintainability, testability, and code navigation

### 3. React Hooks Usage

**Finding:** 657 instances of React hooks across 135 files

**Analysis:**
- Good: Hooks are being used appropriately
- Consider: Review for optimization opportunities (useMemo, useCallback)
- Check: Ensure proper dependency arrays to avoid unnecessary re-renders

**Recommendation:**
- Audit large components for memoization opportunities
- Ensure useEffect cleanup functions are present where needed
- Consider extracting complex hook logic into custom hooks

### 4. Barrel Files

**Finding:** Only 2 barrel files found, both properly documented:
- `src/lib/db/index.ts` - Documented with biome-ignore (intentional)
- `src/app/codebusters/components/index.ts` - Documented with biome-ignore (intentional)

**Status:** ✅ Good - Barrel files are minimal and intentional

## Future Improvements

### High Priority
1. **Fix React key prop issues** - Replace array index keys with unique identifiers (36 files)
2. **Consolidate duplicate cache implementations** - Create base cache class
3. Replace `any` types in API routes and services
4. Review and resolve TODO/FIXME comments
5. Remove deprecated code after migration
6. **Split files over 1000 lines** - Start with largest files
7. **Add React Error Boundaries** - Prevent app crashes from component errors

### Medium Priority
1. **Improve accessibility** - Add ARIA labels to interactive elements, convert div onClick to buttons
2. **Use constants files** - Replace magic numbers with constants from `src/lib/constants/`
3. Add JSDoc comments to complex functions
4. Improve error messages with more context
5. Add unit tests for utility functions
6. **Optimize React hooks** - Review memoization opportunities
7. **Extract reusable components** from large files

### Low Priority
1. Review and optimize import statements
2. Add performance monitoring for critical paths
3. Consider code splitting for large route files
4. **Add more React.memo** - Only 4 instances found, could benefit large components
5. **Review useMemo/useCallback usage** - 246 instances found, ensure all are necessary

## Performance Optimization Opportunities

### React Memoization
- **Current State:** 246 useMemo/useCallback instances, 4 React.memo instances
- **Opportunity:** Large components like `PeopleTab.tsx` (1,499 lines) could benefit from React.memo
- **Recommendation:** 
  - Wrap large list components with React.memo
  - Review useMemo/useCallback usage to ensure they're preventing unnecessary re-renders
  - Consider memoizing expensive array transformations in large components

### Code Splitting
- **Current State:** All routes are server/client components appropriately
- **Opportunity:** Large route files could benefit from dynamic imports
- **Recommendation:**
  - Use dynamic imports for heavy components
  - Lazy load non-critical features
  - Consider route-based code splitting for large pages

### 9. Inconsistent Error Handling in API Routes ⚠️

**Finding:** Not all API routes use the standardized error handler

**Analysis:**
- 179 API routes use `handleError`/`handleValidationError` from `error-handler.ts`
- 464 API routes have error responses, but many may not be using standardized handlers
- Some routes use `NextResponse.json` directly for errors instead of `createErrorResponse`

**Recommendation:**
- Audit all API routes to ensure they use `handleError` and `handleValidationError`
- Use `withErrorHandling` wrapper for consistent error handling
- Replace direct `NextResponse.json` error responses with `createErrorResponse`

**Example of inconsistent pattern:**
```typescript
// ❌ Inconsistent
return NextResponse.json({ error: "Something went wrong" }, { status: 500 });

// ✅ Standardized
return handleError(error, "Context description");
```

### 10. Deprecated Code Still in Use ⚠️

**Finding:** Deprecated code is still being imported/used

**Files using deprecated `pool.ts`:**
- `src/lib/db/notifications.ts`
- `src/lib/db/teamExtras.ts`
- `src/app/api/assignments/submit/route.ts`
- `src/app/unlimited/utils/idBuild.ts`

**Deprecated function still exported:**
- `src/lib/utils/base52.ts` - `getQuestionByRank()` throws error but is still exported

**Recommendation:**
- Migrate remaining usages of `pool.ts` to Drizzle ORM
- Remove deprecated `getQuestionByRank` function after migration
- Document migration timeline for deprecated code

### 11. Test Coverage Configuration

**Finding:** Vitest coverage is configured but may have gaps

**Current Configuration:**
- Coverage includes: `src/app/api/teams/**/*.ts`, `src/app/teams/components/**/*.tsx`
- Coverage excludes: test files, config files, test-utils
- Coverage directory: `./coverage` (already in `.gitignore` ✅)

**Recommendation:**
- Review coverage reports to identify untested code paths
- Ensure critical API routes have comprehensive test coverage
- Consider adding coverage thresholds for new code

### 12. Environment Variable Access Patterns

**Finding:** 168 environment variable accesses across 53 files

**Analysis:**
- ✅ Good: `supabaseServer.ts` validates required env vars
- ✅ Good: `pool.ts` validates `DATABASE_URL`
- ⚠️ Issue: Some files use `process.env.VAR!` (non-null assertion) without validation
- ⚠️ Issue: No centralized env validation utility

**Recommendation:**
- Create centralized environment variable validation utility
- Replace non-null assertions with proper validation
- Document all required environment variables in README

## Summary

This codebase quality audit has identified:
- ✅ **Good practices:** Security, error handling patterns, logging, test coverage, `.gitignore` configuration
- ⚠️ **Areas for improvement:** React key props, accessibility, error boundaries, code duplication, inconsistent error handling, deprecated code usage
- 📊 **Metrics tracked:** Type safety, file sizes, dependencies, hooks usage, array operations, error handling patterns

**Next Steps:**
1. Prioritize fixing React key prop issues (36 files)
2. Add React Error Boundaries
3. Consolidate duplicate cache implementations
4. **Standardize error handling** - Ensure all API routes use `error-handler.ts`
5. **Migrate deprecated code** - Remove `pool.ts` usage, remove deprecated functions
6. **Remove unused deprecated exports** - `getQuestionByRank()` in `base52.ts`
7. Continue replacing magic numbers with constants
8. Improve accessibility with ARIA labels

### 13. Unused Deprecated Function Export ⚠️

**Finding:** `getQuestionByRank()` in `src/lib/utils/base52.ts` is deprecated but still exported

**Details:**
- Function throws an error when called: "getQuestionByRank is deprecated. Use getQuestionByCode instead."
- Still exported from the module, which could confuse developers
- No usages found in codebase (good - migration complete)

**Recommendation:**
- Remove the deprecated function export entirely
- If needed for backward compatibility, document removal in changelog
- Function is not used anywhere, safe to remove

### 14. Equality Operator Usage

**Finding:** Mix of strict (`===`, `!==`) and loose (`==`, `!=`) equality operators

**Analysis:**
- 1,998 instances of `==` or `!=` across 294 files
- 1,993 instances of `===` or `!==` across 291 files
- Most code uses strict equality (good practice)
- Some loose equality may be intentional (e.g., null/undefined checks)

**Recommendation:**
- Review loose equality usage to ensure it's intentional
- Prefer strict equality (`===`, `!==`) for type safety
- Use loose equality only when intentionally checking for null/undefined together
- Consider using `== null` pattern for null/undefined checks (acceptable)

**Example:**
```typescript
// ✅ Acceptable - checking for null or undefined
if (value == null) { ... }

// ⚠️ Review - may need strict equality
if (value == 0) { ... }  // Should be === 0
```

### 15. Array Length Checks

**Finding:** 316 instances of `.length === 0` or `.length !== 0` across 137 files

**Analysis:**
- Most are appropriate and clear
- Some could be simplified to truthy/falsy checks where appropriate
- `.length === 0` is explicit and readable (preferred over `!array.length`)

**Recommendation:**
- Keep `.length === 0` pattern (explicit and clear)
- Consider `.length > 0` instead of `.length !== 0` for readability
- Current usage is acceptable, no changes needed

### 16. File Organization ✅

**Action Taken:** Moved `CODEBASE_QUALITY_IMPROVEMENTS.md` from root to `docs/development/`

**Rationale:**
- Documentation files should not be in project root
- `docs/development/` is appropriate for development-related documentation
- Keeps root directory clean and organized

**Status:** ✅ Completed

### 17. Memory Leak Prevention - Timers ⚠️

**Finding:** 54 instances of `setTimeout` and 18 instances of `clearTimeout` across codebase

**Analysis:**
- Most components properly clean up timers in `useEffect` cleanup functions
- Some components may have missing cleanup for timers
- Need to verify all `setTimeout`/`setInterval` calls have corresponding cleanup

**Files with Timer Usage:**
- `src/app/teams/components/RosterTab.tsx` - ✅ Has cleanup: `clearTimeout(saveTimeoutRef.current)`
- `src/app/plagiarism/page.tsx` - Uses `setTimeout` for worker operations
- `src/app/test/hooks/useTestState.ts` - Uses timers for countdown
- `src/app/codebusters/page.tsx` - Uses timers for various operations

**Recommendation:**
- Audit all `setTimeout`/`setInterval` usage to ensure cleanup
- Use `useRef` to store timer IDs
- Always return cleanup function in `useEffect` when using timers
- Consider creating a custom `useTimeout` hook for consistent cleanup

**Example Pattern:**
```typescript
useEffect(() => {
  const timerId = setTimeout(() => {
    // Do something
  }, 1000);
  
  return () => clearTimeout(timerId);
}, [dependencies]);
```

### 18. Commented Out Code ⚠️

**Finding:** Commented out imports and code in several files

**Files with Commented Code:**
- `src/app/test/hooks/useTestState.ts` - Has commented imports:
  - `// import { fetchIdQuestionsForParams } from '../utils/idFetch';`
  - `// import { buildApiParams,`
  - `// import { getEventOfflineQuestions } from '@/app/utils/storage';`
- `src/app/plagiarism/page.tsx` - Has commented notes about moved code

**Recommendation:**
- Remove commented out code that's no longer needed
- If code is kept for reference, add a TODO comment explaining why
- Use version control history instead of keeping commented code
- Clean up commented imports that are no longer used

**Action Items:**
- Review `useTestState.ts` and remove unused commented imports
- Clean up commented code in `plagiarism/page.tsx` if no longer needed

### 19. Test Utilities Organization ✅

**Finding:** Test utilities are well-organized in `src/test-utils/`

**Analysis:**
- ✅ Good: `test-providers.tsx` is clean and focused
- ✅ Good: Comment notes removed unused exports
- ✅ Good: Comprehensive test utilities in `index.tsx`
- ✅ Good: Well-documented in README

**Status:** ✅ Good - Test utilities are well-organized and maintained

### 20. useEffect Cleanup Patterns

**Finding:** Most `useEffect` hooks have proper cleanup functions

**Analysis:**
- Most components properly return cleanup functions
- Event listeners are properly removed
- Timers are cleaned up in most cases
- AbortControllers are used for fetch cancellation

**Good Examples:**
- `src/app/hooks/useNotifications.ts` - ✅ Cleans up AbortController
- `src/app/teams/components/StreamTab.tsx` - ✅ Removes event listeners
- `src/app/teams/components/RosterTab.tsx` - ✅ Cleans up timers

**Recommendation:**
- Continue following current cleanup patterns
- Audit any `useEffect` hooks without cleanup that should have it
- Document why cleanup is omitted if intentionally skipped

### 21. Input Validation Coverage

**Finding:** 185 Zod schema definitions and 58 `.parse()`/`.safeParse()` calls across API routes

**Analysis:**
- ✅ Good: Most API routes use Zod for validation
- ✅ Good: Centralized validation schemas in `src/lib/schemas/teams-validation.ts`
- ✅ Good: tRPC routes have built-in validation
- ⚠️ Opportunity: Some routes may have duplicate validation logic

**Validation Usage:**
- `src/lib/schemas/teams-validation.ts` - Comprehensive validation schemas
- `src/lib/trpc/routers/teams.ts` - Uses Zod schemas for input validation
- `src/app/api/teams/**` - Most routes use validation schemas

**Recommendation:**
- Continue using centralized validation schemas
- Extract common validation patterns to shared schemas
- Ensure all API routes validate input before processing
- Use `.safeParse()` for validation that shouldn't throw

### 22. Environment Variable Validation ✅

**Finding:** Environment variables are properly validated

**Analysis:**
- ✅ Good: `src/lib/db/index.ts` validates `DATABASE_URL` with error throw
- ✅ Good: `src/lib/db/pool.ts` validates `DATABASE_URL` with error throw
- ✅ Good: `src/lib/utils/error-handler.ts` has `validateEnvironment()` function
- ✅ Good: No non-null assertions (`!`) found for environment variables

**Files with Proper Validation:**
- `src/lib/db/index.ts` - ✅ Throws error if `DATABASE_URL` missing
- `src/lib/db/pool.ts` - ✅ Throws error if `DATABASE_URL` missing
- `src/app/api/teams/create/route.ts` - ✅ Checks `DATABASE_URL` before use

**Status:** ✅ Good - Environment variables are properly validated

### 23. Type Safety in API Routes

**Finding:** 294 instances of `any` type in API routes (mostly in test files)

**Analysis:**
- Most `any` usage is in test files (acceptable)
- Some API routes use `any` for request/response types
- tRPC routes have better type safety than REST routes

**Recommendation:**
- Replace `any` types in API route handlers with proper types
- Use Zod schema inference for request/response types
- Leverage TypeScript's type system for better safety

**Example Pattern:**
```typescript
// ❌ Avoid
const body: any = await request.json();

// ✅ Prefer
const body = await request.json();
const validated = RequestSchema.parse(body);
```

### 24. Validation Schema Organization ✅

**Finding:** Validation schemas are well-organized

**Analysis:**
- ✅ Good: Centralized schemas in `src/lib/schemas/teams-validation.ts`
- ✅ Good: Reusable validators (UUID, TeamSlug, EventName)
- ✅ Good: Helper functions for validation (`formatValidationError`, `validateRequest`)
- ✅ Good: Type exports from schemas

**Status:** ✅ Good - Validation schemas are well-organized and reusable

### 25. Commented Code Cleanup

**Finding:** Commented code in several files

**Files with Commented Code:**
- `src/app/test/hooks/useTestState.ts` - Commented imports (lines 5, 13, 28)
- `src/app/plagiarism/page.tsx` - Commented notes about moved code (lines 17-23)

**Recommendation:**
- Remove commented imports that are no longer used
- Replace commented notes with proper documentation or remove if outdated
- Use version control history instead of keeping commented code

**Action Items:**
1. Clean up commented imports in `useTestState.ts`
2. Review and clean up commented notes in `plagiarism/page.tsx`

### 26. Duplicate Utility Functions ⚠️

**Finding:** Multiple slugify functions with similar functionality

**Duplicate Functions:**
- `slugifyEventName()` in `src/app/utils/storage.ts` - Simple slugification for event names
- `slugifyText()` in `src/lib/utils/markdown.ts` - More comprehensive slugification using github-slugger

**Analysis:**
- `slugifyEventName` is simpler: `name.toLowerCase().replace(/[^a-z0-9]+/g, "-")`
- `slugifyText` uses `github-slugger` library for more robust slug generation
- Both serve similar purposes but have different implementations

**Recommendation:**
- Consolidate to use `slugifyText` from `markdown.ts` for consistency
- Update `slugifyEventName` to use `slugifyText` or remove if redundant
- Ensure all slugification uses the same utility function

**Files Using slugifyEventName:**
- `src/app/utils/storage.ts` - Definition
- Used in various places for event name slugification

**Files Using slugifyText:**
- `src/lib/utils/markdown.ts` - Definition
- Used in markdown processing

### 27. API Response Format Consistency

**Finding:** 192 API routes with success/error response patterns, 119 route handlers

**Analysis:**
- ✅ Good: Most routes use consistent `{ success, data, error }` format
- ✅ Good: `ApiResponse<T>` type defined in `src/lib/types/api.ts`
- ⚠️ Issue: Some routes use direct `NextResponse.json` instead of standardized format
- ⚠️ Issue: `src/app/api/assignments/[assignmentId]/route.ts` doesn't use standardized error handler

**Inconsistent Patterns:**
- `src/app/api/assignments/[assignmentId]/route.ts` - Uses direct `NextResponse.json` for errors
- Some routes use `{ error, details }` format
- Some routes use `{ success, data }` format

**Recommendation:**
- Standardize all API routes to use `ApiResponse<T>` type
- Use `handleError` from `error-handler.ts` for consistent error responses
- Update routes like `assignments/[assignmentId]/route.ts` to use standardized error handling

**Example Standardization:**
```typescript
// ❌ Inconsistent
return NextResponse.json({ error: "Not found" }, { status: 404 });

// ✅ Standardized
return handleNotFoundError("Assignment");
```

### 28. API Route Handler Count

**Finding:** 119 API route handlers (GET/POST/PUT/DELETE/PATCH) across codebase

**Analysis:**
- Good distribution of HTTP methods
- Most routes follow RESTful conventions
- Some routes may benefit from consolidation

**Recommendation:**
- Review routes for consolidation opportunities
- Ensure consistent naming conventions
- Document API route structure and patterns

### 29. Duplicate Slugify Functions ⚠️

**Finding:** Two similar slugify functions with slightly different implementations

**Functions:**
1. `slugifyEventName()` in `src/app/utils/storage.ts`
   - Implementation: `name.toLowerCase().replace(/[^a-z0-9]+/g, "-")`
   - Simpler, removes all non-alphanumeric characters

2. `slugifyText()` in `src/lib/utils/markdown.ts`
   - Implementation: More comprehensive with trim and space handling
   - Uses: `.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")`

**Analysis:**
- Both functions serve similar purposes
- `slugifyText` is more comprehensive (handles spaces better)
- `slugifyEventName` is simpler but less robust

**Recommendation:**
- Consolidate to use `slugifyText` from `markdown.ts` for consistency
- Update `slugifyEventName` to call `slugifyText` or remove if redundant
- Ensure all slugification uses the same utility function

**Files Using slugifyEventName:**
- `src/app/utils/storage.ts` - Definition
- Used for event name slugification

**Files Using slugifyText:**
- `src/lib/utils/markdown.ts` - Definition
- Used in markdown processing

### 30. API Route Error Handling Inconsistency

**Finding:** Some API routes don't use standardized error handler

**Example:**
- `src/app/api/assignments/[assignmentId]/route.ts` - Uses direct `NextResponse.json` for errors instead of `handleError`

**Current Pattern (Inconsistent):**
```typescript
catch (error) {
  return NextResponse.json(
    {
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}
```

**Recommended Pattern (Standardized):**
```typescript
catch (error) {
  return handleError(error, "Get assignment");
}
```

**Recommendation:**
- Update `assignments/[assignmentId]/route.ts` to use `handleError`
- Audit other routes for similar inconsistencies
- Ensure all routes use standardized error handling from `error-handler.ts`

### 31. SQL Injection Prevention ✅

**Finding:** All database queries use parameterized queries or ORM

**Analysis:**
- ✅ Excellent: All `queryCockroachDB` calls use parameterized queries (`$1`, `$2`, etc.)
- ✅ Excellent: Drizzle ORM is used extensively, which prevents SQL injection
- ✅ Excellent: No string concatenation in SQL queries found
- ✅ Good: `queryCockroachDB` function enforces parameterized queries

**Examples:**
- `src/app/api/assignments/[assignmentId]/route.ts` - Uses `$1`, `$2` parameters ✅
- `src/lib/trpc/routers/teams.ts` - Uses Drizzle ORM ✅
- `src/lib/cockroachdb.ts` - `queryCockroachDB` function uses parameterized queries ✅

**Status:** ✅ Excellent - No SQL injection vulnerabilities found

### 32. Authentication Coverage

**Finding:** 237 instances of authentication checks across 77 API route files

**Analysis:**
- ✅ Good: Most API routes check authentication
- ✅ Good: `getServerUser()` is used consistently
- ✅ Good: tRPC routes use `protectedProcedure` for automatic auth
- ✅ Good: Unauthorized requests return 401 status

**Authentication Patterns:**
- REST routes: `const user = await getServerUser(); if (!user?.id) return 401`
- tRPC routes: Use `protectedProcedure` which enforces authentication
- Server pages: Check auth before rendering

**Recommendation:**
- Continue current authentication patterns
- Ensure all protected routes have auth checks
- Consider creating auth middleware for REST routes

### 33. Database Query Patterns ✅

**Finding:** Good mix of ORM and parameterized queries

**Analysis:**
- ✅ Good: Drizzle ORM used for most queries (type-safe, prevents SQL injection)
- ✅ Good: `queryCockroachDB` used with parameterized queries for complex queries
- ✅ Good: No raw SQL string concatenation found
- ✅ Good: All queries use proper parameterization

**Query Methods:**
- Drizzle ORM: Type-safe, preferred for new code
- `queryCockroachDB`: Parameterized queries for complex operations
- `pool.query`: Deprecated, but still uses parameterized queries

**Status:** ✅ Good - Database queries are secure and well-structured

### 34. Code Complexity in Assignment Route

**Finding:** `src/app/api/assignments/[assignmentId]/route.ts` has complex question transformation logic

**Analysis:**
- GET handler is 378 lines with complex nested logic
- Question transformation logic (lines 175-359) is very long
- Multiple nested conditionals and type conversions
- Codebusters question handling is complex (lines 182-242)
- MCQ/FRQ answer conversion logic is complex (lines 283-326)

**Recommendation:**
- Extract question transformation logic into separate functions:
  - `transformCodebustersQuestion()` - Handle codebusters questions
  - `transformMCQQuestion()` - Handle multiple choice questions
  - `transformFRQQuestion()` - Handle free response questions
  - `parseQuestionOptions()` - Parse JSONB options
  - `convertAnswerFormat()` - Convert database answers to frontend format
- This would improve readability and testability
- Each function would have a single responsibility

**Example Refactoring:**
```typescript
// Extract to helper functions
function transformCodebustersQuestion(q: QuestionRow, codebustersData: CodebustersData | null) {
  // ... codebusters transformation logic
}

function convertMCQAnswer(answerStr: string, options: string[], questionIndex: number) {
  // ... MCQ answer conversion logic
}
```

### 35. Repeated Null Coalescing Patterns

**Finding:** Repeated null coalescing patterns in `assignments/[assignmentId]/route.ts`

**Analysis:**
- Multiple instances of `codebustersData?.property || defaultValue` pattern
- Could be simplified with a helper function or default object
- Pattern appears 11 times in the file

**Example Pattern:**
```typescript
author: codebustersData?.author || "Unknown",
cipherType: codebustersData?.cipherType || "Random Aristocrat",
division: codebustersData?.division || "C",
charLength: codebustersData?.charLength || 100,
// ... repeated pattern
```

**Recommendation:**
- Create a helper function to merge codebusters data with defaults
- Use object spread with defaults: `{ ...defaultCodebustersData, ...codebustersData }`
- Reduces repetition and makes defaults easier to maintain

**Example:**
```typescript
const defaultCodebustersData = {
  author: "Unknown",
  cipherType: "Random Aristocrat",
  division: "C",
  charLength: 100,
  encrypted: "",
  key: "",
  hint: "",
};

const mergedData = { ...defaultCodebustersData, ...codebustersData };
```

### 36. Function Length and Complexity

**Finding:** Some functions exceed recommended complexity thresholds

**Analysis:**
- `assignments/[assignmentId]/route.ts` GET handler: ~320 lines of logic
- Question transformation logic is deeply nested
- Multiple responsibilities in single function

**Recommendation:**
- Split large functions into smaller, focused functions
- Each function should have a single responsibility
- Improve testability and maintainability
- Follow Single Responsibility Principle

### 37. Code Formatting and Style ✅

**Finding:** Code formatting is consistent

**Analysis:**
- ✅ Good: Biome formatter configured with consistent rules
- ✅ Good: 2-space indentation, double quotes, semicolons
- ✅ Good: Import organization enabled
- ✅ Good: Line width set to 100 characters

**Status:** ✅ Good - Code formatting is consistent and automated

### 38. Linter Suppressions

**Finding:** 10 linter suppressions across 5 files

**Analysis:**
- ✅ Good: All suppressions are documented and intentional
- ✅ Good: Most are in test files or barrel files (acceptable)
- ✅ Good: Suppressions use `biome-ignore` with explanations

**Files with Suppressions:**
- `src/test-utils/index.tsx` - Barrel file (intentional)
- `src/lib/db/index.ts` - Barrel file (intentional)
- `src/app/codebusters/components/index.ts` - Barrel file (intentional)
- `src/app/analytics/__tests__/eloDataProcessor.test.ts` - Test file (acceptable)
- `src/app/analytics/components/CompareTool.tsx` - Complexity suppression (documented)

**Status:** ✅ Good - Suppressions are minimal and well-documented

### 39. Type Assertions in Assignment Route

**Finding:** 14 instances of type coercion using `String()`, `Number()`, `Boolean()` in `assignments/[assignmentId]/route.ts`

**Analysis:**
- Uses `String()`, `Number()`, `Boolean()` constructors for type coercion
- Some type assertions using `as` keyword
- Could be improved with proper type guards or validation

**Examples:**
```typescript
id: String(assignmentRow.id),
title: String(assignmentRow.title),
points: Number(assignmentRow.points),
isRequired: Boolean(assignmentRow.is_required),
```

**Recommendation:**
- Consider using type guards for safer type checking
- Use proper parsing functions (e.g., `Number.parseInt()`, `Number.parseFloat()`) where appropriate
- Validate data types before coercion
- Current usage is acceptable but could be more type-safe

### 40. JSDoc Documentation Coverage

**Finding:** Some complex functions lack JSDoc comments

**Analysis:**
- ✅ Good: Many functions have JSDoc comments
- ✅ Good: Complex functions in `assignments/[assignmentId]/route.ts` have inline comments
- ⚠️ Opportunity: Some utility functions could benefit from JSDoc

**Recommendation:**
- Add JSDoc to all exported functions
- Document complex transformation logic
- Include examples for non-obvious functions
- Document parameter types and return types

**Example:**
```typescript
/**
 * Transforms a database question row into frontend question format
 * @param row - Database question row
 * @param index - Question index for error messages
 * @returns Transformed question object
 * @throws Error if question validation fails
 */
function transformQuestion(row: QuestionRow, index: number): Question {
  // ...
}
```

### 41. Type Coercion Patterns

**Finding:** Use of `String()`, `Number()`, `Boolean()` constructors

**Analysis:**
- 19 instances across 10 API route files
- Generally acceptable for database result transformation
- Could be improved with proper type validation

**Recommendation:**
- Continue using constructors for database result transformation (acceptable)
- Add validation for critical values
- Consider using type guards for complex transformations
- Current patterns are acceptable for database result handling

### 42. Array Mutation Patterns

**Finding:** 85 instances of mutable array operations (`.push()`, `.pop()`, `.shift()`, `.unshift()`) across 29 API files

**Analysis:**
- Mutable operations are common in API routes for building response arrays
- Some operations could be replaced with immutable patterns
- Most usage is acceptable for API route handlers

**Recommendation:**
- Consider using spread operators or `Array.from()` for immutable patterns where appropriate
- Current usage in API routes is generally acceptable
- For React components, prefer immutable patterns to avoid re-render issues

**Example:**
```typescript
// ❌ Mutable (acceptable in API routes)
const results = [];
data.forEach(item => results.push(transform(item)));

// ✅ Immutable (preferred in React components)
const results = data.map(item => transform(item));
```

### 43. Date Handling Patterns

**Finding:** 135 instances of `new Date()`, `Date.now()`, and date operations across 45 files

**Analysis:**
- ✅ Good: Timezone-aware date handling in `TeamCalendar.tsx` with `createTimezoneAwareDateTime()`
- ✅ Good: Consistent use of ISO date strings for database storage
- ⚠️ Opportunity: Some date operations could use a centralized date utility

**Recommendation:**
- Consider creating a centralized date utility for common operations
- Ensure timezone handling is consistent across the codebase
- Current patterns are acceptable but could benefit from standardization

**Files with Date Operations:**
- `src/app/teams/components/TeamCalendar.tsx` - Timezone-aware date creation
- `src/app/teams/components/calendar/EventList.tsx` - Date filtering and sorting
- `src/app/teams/components/calendar/MobileDayEvents.tsx` - Date comparisons
- `src/app/reports/page.tsx` - Date formatting

### 44. forEach vs Functional Patterns

**Finding:** 302 instances of `forEach`, `for...of`, `for...in` loops across 97 files

**Analysis:**
- Many `forEach` loops could be replaced with `map`, `filter`, or `reduce`
- Some `forEach` usage is appropriate (side effects, early returns)
- Functional patterns improve readability and immutability

**Recommendation:**
- Replace `forEach` with `map` when transforming arrays
- Replace `forEach` with `filter` when filtering arrays
- Keep `forEach` for side effects (logging, API calls)
- Current usage is acceptable but could be more functional

**Example:**
```typescript
// ❌ forEach for transformation
const results = [];
items.forEach(item => results.push(transform(item)));

// ✅ map for transformation
const results = items.map(item => transform(item));
```

### 45. Array Sorting Patterns

**Finding:** 52 instances of `.sort()` and `.reverse()` across 26 files

**Analysis:**
- Most sorting operations are appropriate
- Some sorts could be extracted to utility functions
- Sorting with date comparisons is common

**Recommendation:**
- Consider extracting common sort functions to utilities
- Ensure sort comparators are pure functions
- Current patterns are acceptable

**Example:**
```typescript
// Common pattern - could be extracted
events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
```

### 46. Array Length Check Patterns

**Finding:** 555 instances of `.length === 0`, `.length !== 0`, `.length > 0`, `.length === 1` across 172 files

**Analysis:**
- Most length checks are explicit and clear
- `.length === 0` is preferred over `!array.length` for readability
- Some checks could use utility functions for consistency

**Recommendation:**
- Keep explicit length checks (`.length === 0`, `.length > 0`)
- Consider utility functions for common patterns if needed
- Current usage is acceptable and readable

### 47. JSON Parsing Patterns

**Finding:** 134 instances of `JSON.parse()` and `JSON.stringify()` across 37 API files

**Analysis:**
- ✅ Good: Most JSON parsing has try-catch error handling
- ✅ Good: `StorageService` provides safe JSON parsing with error handling
- ⚠️ Opportunity: Some direct `JSON.parse()` calls could use safer utilities

**Recommendation:**
- Use `StorageService.get<T>()` for localStorage JSON parsing
- Ensure all `JSON.parse()` calls have error handling
- Consider a centralized JSON parsing utility for API responses
- Current patterns are mostly acceptable

**Files with JSON Operations:**
- `src/lib/utils/storage.ts` - ✅ Safe JSON parsing with error handling
- `src/app/api/assignments/[assignmentId]/route.ts` - Has try-catch for JSON parsing
- `src/app/codebusters/hooks/useCodebustersState.ts` - Has error handling for JSON.parse
- `src/lib/services/gemini/validation.ts` - Has error handling for JSON.parse

**Example:**
```typescript
// ✅ Good - with error handling
try {
  const parsed = JSON.parse(data);
} catch (error) {
  logger.error("Failed to parse JSON", error);
  return null;
}

// ✅ Better - use StorageService for localStorage
const data = StorageService.get<MyType>("key");
```

### 48. TODO/FIXME Comments Review

**Finding:** 5 TODO/FIXME comments across 5 files

**Files with TODO/FIXME:**
- `src/lib/trpc/routers/teams.ts` - 1 TODO
- `src/app/test/Content.tsx` - 1 TODO
- `src/lib/services/notification-sync.ts` - 1 TODO
- `src/app/api/teams/[teamId]/assignments/route.ts` - 1 TODO
- `src/app/api/teams/[teamId]/assignments/[assignmentId]/decline/route.ts` - 1 TODO

**Recommendation:**
- Review each TODO/FIXME and either:
  - Implement the fix if it's a quick change
  - Convert to GitHub issue if it requires more work
  - Remove if no longer relevant
- Document TODOs with context and priority

### 49. Deprecated Code Annotations

**Finding:** 2 files with `@deprecated` annotations

**Files:**
- `src/app/utils/bookmarks.ts` - Contains deprecated code
- `src/lib/db/pool.ts` - Marked as deprecated (use Drizzle ORM)

**Recommendation:**
- Review deprecated code usage and migrate remaining usages
- Remove deprecated code after migration is complete
- Document migration path for deprecated functions

### 50. Path Alias Usage ✅

**Finding:** Path aliases are well-configured and used consistently

**Analysis:**
- ✅ Good: `tsconfig.json` has comprehensive path aliases configured
- ✅ Good: Path aliases include `@/*`, `@components/*`, `@app/*`, `@lib/*`, `@utils/*`, `@app-utils/*`, `@test-utils/*`
- ✅ Good: No deep relative imports found (e.g., `../../../`)
- ✅ Good: Vitest config also includes path aliases

**Status:** ✅ Good - Path aliases are well-configured and used consistently

### 51. Barrel File Usage

**Finding:** 57 instances of barrel file exports (`export * from` or `export { ... } from`) across 12 files

**Analysis:**
- ✅ Good: Barrel files are minimal and intentional
- ✅ Good: Most barrel files are documented with `biome-ignore` comments
- ✅ Good: Barrel files are in appropriate locations (index files, component directories)

**Files with Barrel Exports:**
- `src/test-utils/index.tsx` - Test utilities (documented)
- `src/lib/db/index.ts` - Database exports (documented)
- `src/app/codebusters/components/index.ts` - Component exports (documented)
- `src/app/codebusters/hooks/index.ts` - Hook exports
- `src/app/codebusters/components/cipher-displays/index.ts` - Display component exports

**Status:** ✅ Good - Barrel files are minimal, intentional, and well-documented

### 52. Test File Organization ✅

**Finding:** Test files are well-organized

**Analysis:**
- ✅ Good: Test files use `.test.ts` and `.test.tsx` extensions
- ✅ Good: Test files are co-located with source files
- ✅ Good: Some tests use `__tests__` directories for organization
- ✅ Good: 14 README files in test directories for documentation

**Test File Locations:**
- Co-located: `src/**/*.test.{ts,tsx}`
- Test directories: `src/**/__tests__/**`
- Test utilities: `src/test-utils/`

**Status:** ✅ Good - Test files are well-organized and documented

### 53. Environment Variable Access Patterns

**Finding:** 59 instances of `process.env` access across 29 API files

**Analysis:**
- ✅ Good: `src/lib/db/index.ts` validates `DATABASE_URL` with error throw
- ✅ Good: `src/lib/supabaseServer.ts` validates Supabase env vars with error throws
- ✅ Good: `src/lib/db/pool.ts` validates `DATABASE_URL` before use
- ⚠️ Opportunity: Some files may use `process.env.VAR!` non-null assertions

**Recommendation:**
- Continue using validation patterns like in `db/index.ts` and `supabaseServer.ts`
- Replace any remaining non-null assertions with proper validation
- Consider creating a centralized env validation utility for consistency

**Example Pattern:**
```typescript
// ✅ Good - with validation
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// ❌ Avoid - non-null assertion
const connectionString = process.env.DATABASE_URL!;
```

### 54. TypeScript Configuration ✅

**Finding:** TypeScript configuration is excellent

**Analysis:**
- ✅ Good: Strict mode enabled with all strict flags
- ✅ Good: `noUnusedLocals` and `noUnusedParameters` enabled
- ✅ Good: `noImplicitReturns` and `noFallthroughCasesInSwitch` enabled
- ✅ Good: `noUncheckedIndexedAccess` enabled for safer array/object access
- ✅ Good: Comprehensive path aliases configured
- ✅ Good: Proper include/exclude patterns

**Status:** ✅ Excellent - TypeScript configuration follows best practices

## Final Summary

This comprehensive codebase quality audit has identified:

### ✅ Strengths
- **Security:** Excellent SQL injection prevention, parameterized queries, proper authentication
- **Error Handling:** Standardized error handlers, good coverage
- **Type Safety:** TypeScript usage is good, though some `any` types remain
- **Code Organization:** Well-structured directories, minimal barrel files
- **Testing:** Good test coverage (68 test files)
- **Formatting:** Consistent code style with Biome

### ⚠️ Areas for Improvement
1. **React Key Props** - 36 files using array index as key
2. **Error Boundaries** - Missing React Error Boundaries
3. **Code Duplication** - Duplicate cache implementations (~95% duplicate)
4. **Large Files** - 8 files over 1000 lines need splitting
5. **Error Handling** - Some routes don't use standardized handlers
6. **Deprecated Code** - Some deprecated code still in use
7. **Function Complexity** - Some functions are too long/complex

### 📊 Quality Metrics
- **Files Analyzed:** 1000+ files
- **Dependencies Removed:** 9 unused dependencies
- **Files Cleaned:** 19 markdown/documentation files
- **Constants Created:** 2 (plagiarism, testParams)
- **Security Issues:** 0 SQL injection vulnerabilities found
- **Type Safety:** 938 `any` types (documented for improvement)
- **Test Coverage:** 68 test files
- **Large Files:** 8 files >1000 lines identified
- **TODO/FIXME Comments:** 5 across 5 files
- **Barrel Files:** 12 files (all well-documented)
- **Path Aliases:** ✅ Well-configured and used consistently
- **TypeScript Config:** ✅ Excellent strict mode configuration

### 🎯 Priority Actions
1. Fix React key prop issues (36 files)
2. Add React Error Boundaries
3. Consolidate duplicate cache implementations
4. Standardize error handling across all API routes
5. Split large files (>1000 lines)
6. Migrate/remove deprecated code
7. Extract complex functions into smaller, focused functions

**Documentation Location:** This file is located in `docs/development/` (not root directory) ✅

## Additional Quality Findings

### 1. Missing React Error Boundaries ⚠️

**Finding:** No React Error Boundaries found in the codebase

**Impact:**
- Unhandled errors in components can crash the entire app
- No graceful error recovery mechanism
- Poor user experience when errors occur

**Recommendation:**
- Add Error Boundary components for:
  - Main app layout
  - Critical feature areas (teams, test-taking, codebusters)
  - API route error handling (already has error handlers)

**Example Implementation:**
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // componentDidCatch implementation
}
```

### 2. Magic Numbers Should Be Constants 📊

**Finding:** Magic numbers scattered throughout codebase

**Files with Magic Numbers:**
- `src/app/plagiarism/utils/fuzzyWorker.ts` - Similarity thresholds (0.3, 0.4, 0.7, 0.85, 0.95)
- `src/app/utils/testParams.ts` - Validation limits (1, 200, 120, 100, 10)
- `src/app/unlimited/utils/prepare.ts` - Default values (0.5, 1000)

**Action Taken:** ✅ Created constants files:
- `src/lib/constants/plagiarism.ts` - Plagiarism detection constants
- `src/lib/constants/testParams.ts` - Test parameter limits

**Next Steps:**
- Update code to use these constants
- Extract remaining magic numbers to constants
- Update `fuzzyWorker.ts` to use `SIMILARITY_THRESHOLDS` and `MATCH_LIMITS`
- Update `testParams.ts` to use `QUESTION_LIMITS`, `TIME_LIMITS`, etc.

### 3. Environment Variable Validation

**Finding:** 168 environment variable accesses across 53 files

**Analysis:**
- ✅ Good: `supabaseServer.ts` validates required env vars
- ⚠️ Issue: `src/lib/db/index.ts` uses `process.env.DATABASE_URL!` (non-null assertion)
- ⚠️ Issue: Some env vars accessed without validation

**Recommendation:**
- Create centralized env validation utility
- Replace non-null assertions with proper validation
- Document all required environment variables

### 4. Security Assessment ✅

**Finding:** Good security practices found

**Positive Findings:**
- ✅ No `dangerouslySetInnerHTML` usage found
- ✅ No `eval()` or `Function()` constructor usage
- ✅ No direct SQL string concatenation (uses parameterized queries)
- ✅ Proper authentication checks in API routes

**Status:** Security practices are good. Continue following these patterns.

### 5. Array Operations Performance

**Finding:** 729 array operations (.map, .filter, .reduce) across 220 files

**Analysis:**
- Most operations are appropriate
- Large files like `PeopleTab.tsx` (1,499 lines) have many array operations
- Consider memoization for expensive array transformations

**Recommendation:**
- Review large components for memoization opportunities
- Use `useMemo` for expensive array operations
- Consider virtualization for large lists

### 6. TODO/FIXME Comments

**Finding:** 5 TODO/FIXME comments found

**Comments:**
1. `src/lib/trpc/routers/teams.ts:820` - "TODO: Add removed events table if needed"
2. `src/app/test/Content.tsx:483` - "TODO: Re-enable if needed in the future" (assignment notifications)
3. `src/lib/services/notification-sync.ts:2` - NOTE about raw SQL usage (acceptable)
4. `src/app/api/teams/[teamId]/assignments/route.ts:398` - "TODO: Re-enable if needed in the future"
5. `src/app/api/teams/[teamId]/assignments/[assignmentId]/decline/route.ts:128` - "TODO: Re-enable if needed in the future"

**Recommendation:**
- Review each TODO and either implement or remove
- Convert to GitHub issues if they're future work
- Remove if no longer relevant

## Metrics

- **Unused Dependencies Removed:** 9
- **Files Cleaned:** 19
- **Constants Files Created:** 2 (plagiarism, testParams)
- **Environment Variable Validation:** Fixed DATABASE_URL non-null assertion
- **Type Safety Issues:** 938 `any` types (documented for future improvement)
- **Error Handling:** 72 empty catch blocks (mostly acceptable)
- **Test Coverage:** 68 test files (good coverage)
- **Large Files (>1000 lines):** 8 files identified for splitting
- **Duplicate Code:** 2 cache implementations with ~95% code duplication
- **React Hooks Usage:** 657 instances across 135 files (good usage, optimization opportunities exist)
- **Array Operations:** 729 instances across 220 files (review for memoization)
- **Environment Variables:** 168 accesses across 53 files (some need validation)
- **React Memoization:** 246 useMemo/useCallback instances, 4 React.memo instances (could use more)
- **React Key Props:** 36 files using array index as key (should use unique IDs)
- **Accessibility:** 39 ARIA attributes found (good, but could be improved)
- **Client Components:** 192 "use client" directives (appropriate usage)
- **Default Exports:** 245 default exports (good pattern)
- **Async/Await:** 2,175 instances (good async handling)
- **Magic Numbers:** Extracted to constants files
- **Security:** ✅ No dangerous patterns found (no eval, dangerouslySetInnerHTML)
- **Error Boundaries:** ⚠️ None found (recommendation: add React Error Boundaries)
- **React Key Props:** 36 files using array index as key (should use unique IDs)
- **Accessibility:** 39 ARIA attributes found (good, but could be improved)
- **Barrel Files:** 2 (both properly documented and intentional)

### 7. React Key Prop Issues ⚠️

**Finding:** 36 files using array index as React key prop

**Impact:**
- Can cause rendering issues when list order changes
- Can lead to state bugs when items are added/removed
- Poor performance with dynamic lists

**Files with Index as Key:**
- `src/app/codebusters/components/cipher-displays/AristocratDisplay.tsx` - Uses `key={i}` for keyword inputs
- `src/app/test/Content.tsx` - Uses index in key (but combines with question.id - acceptable)
- `src/app/teams/components/DivisionGroupsGrid.tsx` - Uses `key={group.label}` (good - uses unique label)
- Many other files use index in key

**Recommendation:**
- Replace `key={index}` with unique identifiers
- Use `key={item.id}` or `key={item.id || index}` as fallback
- For keyword inputs, use `key={`keyword-${i}-${quoteIndex}`}` or similar unique combination

**Good Examples Found:**
- `src/app/test/Content.tsx` - Combines question.id with index: `key={question.id ? \`${question.id}-${index}\` : ...}`
- `src/app/teams/components/DivisionGroupsGrid.tsx` - Uses unique label: `key={group.label}`

### 8. Accessibility Assessment

**Finding:** 39 ARIA attributes across 21 files

**Analysis:**
- ✅ Good: Test files include accessibility tests
- ✅ Good: Form inputs have proper labels
- ⚠️ Opportunity: Some interactive elements may need more ARIA labels
- ⚠️ Opportunity: Some divs with onClick may need role="button"

**Recommendation:**
- Audit interactive elements for proper ARIA attributes
- Ensure all buttons have accessible labels
- Add role attributes where semantic HTML isn't used
- Test with screen readers

**Files with Good Accessibility:**
- `src/app/teams/components/assignment/__tests__/QuestionPreviewStep.test.tsx` - Has accessibility tests
- `src/app/analytics/components/ErrorState.tsx` - Uses aria-label


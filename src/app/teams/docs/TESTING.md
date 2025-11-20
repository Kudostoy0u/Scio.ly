# Teams Feature - Testing Guide

This document provides comprehensive information about testing the teams feature, including unit tests, integration tests, and E2E tests.

## Test Structure

```
src/app/api/teams/
├── __tests__/
│   ├── e2e/
│   │   ├── teams-e2e.test.ts          # Core team operations
│   │   └── roster-e2e.test.ts         # Roster management
│   └── utils/
│       └── test-helpers.ts            # Test utilities and helpers
```

## Running Tests

```bash
# Run all teams tests
npm run test:teams

# Run teams integration tests
npm run test:teams-integration

# Run specific test file
npm test src/app/api/teams/__tests__/e2e/teams-e2e.test.ts

# Run tests in watch mode
npm run test:ui
```

## Test Utilities

### Creating Test Data

```typescript
import { createTestUser, createTestTeam, addTeamMember } from "../utils/test-helpers";

// Create a test user
const user = await createTestUser({
  email: "test@example.com",
  displayName: "Test User",
});

// Create a test team
const team = await createTestTeam(user.id, {
  school: "Test School",
  division: "C",
});

// Add a member to the team
await addTeamMember(team.subteamId, anotherUser.id, "member");
```

### Mocking Requests

```typescript
import { createMockRequest, createAuthenticatedRequest } from "../utils/test-helpers";

// Create a basic mock request
const request = createMockRequest(
  "http://localhost:3000/api/teams/test-team/roster?subteamId=123",
  "GET"
);

// Create an authenticated request
const authRequest = createAuthenticatedRequest(
  "http://localhost:3000/api/teams/test-team/roster",
  userId,
  "POST",
  { subteamId: "123", eventName: "Astronomy", slotIndex: 0 }
);
```

### Assertions

```typescript
import { assertUserIsMember, assertUserIsNotMember } from "../utils/test-helpers";

// Assert user is a member
await assertUserIsMember(userId, teamId, "captain");

// Assert user is not a member
await assertUserIsNotMember(userId, teamId);
```

## E2E Test Coverage

### Team Operations
- ✅ Team creation with default subteam
- ✅ Team joining with user code
- ✅ Authorization checks

### Roster Management
- ✅ Creating roster entries
- ✅ Updating roster entries
- ✅ Linking users to roster entries
- ✅ Fetching roster data
- ✅ Event name normalization
- ✅ Slot index validation

### Stream Posts
- ✅ Creating stream posts
- ✅ Post retrieval with comments
- ✅ Authorization for posting

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestUser,
  createTestTeam,
  cleanupTestData,
  type TestUser,
  type TestTeam,
} from "../utils/test-helpers";

describe("Feature Name", () => {
  let testUsers: TestUser[] = [];
  let testTeams: TestTeam[] = [];

  beforeAll(async () => {
    // Setup test data
    testUsers.push(await createTestUser());
    testTeams.push(await createTestTeam(testUsers[0].id));
  });

  afterAll(async () => {
    // Cleanup
    const userIds = testUsers.map((u) => u.id);
    const teamGroupIds = testTeams.map((t) => t.groupId);
    await cleanupTestData(userIds, teamGroupIds);
  });

  it("should perform action", async () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### Best Practices

1. **Always cleanup** - Use `afterAll` to clean up test data
2. **Isolate tests** - Each test should be independent
3. **Use helpers** - Leverage test utilities for common operations
4. **Test edge cases** - Include validation and error cases
5. **Test authorization** - Verify permission checks
6. **Test data integrity** - Verify database constraints

## Test Data Management

### Creating Test Users

```typescript
const user = await createTestUser({
  email: "unique@example.com",
  username: "unique-username",
  displayName: "Test User",
  firstName: "Test",
  lastName: "User",
});
```

### Creating Test Teams

```typescript
const team = await createTestTeam(creatorId, {
  school: "Test School",
  division: "C",
  slug: "test-team-slug",
  captainCode: "CAP-123",
  userCode: "USER-123",
});
```

### Cleanup

Always clean up test data in `afterAll`:

```typescript
afterAll(async () => {
  const userIds = testUsers.map((u) => u.id);
  const teamGroupIds = testTeams.map((t) => t.groupId);
  await cleanupTestData(userIds, teamGroupIds);
});
```

## Mocking Dependencies

### Mocking Authentication

```typescript
import { vi } from "vitest";
import { getServerUser } from "@/lib/supabaseServer";

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

const mockGetServerUser = vi.mocked(getServerUser);
mockGetServerUser.mockResolvedValue({
  id: "user-123",
  email: "test@example.com",
});
```

### Mocking Database

For unit tests, you can mock Drizzle ORM:

```typescript
import { vi } from "vitest";
import { dbPg } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
```

## Integration Testing

Integration tests verify that multiple components work together:

```typescript
describe("Team Creation Integration", () => {
  it("should create team with all related data", async () => {
    // Create team
    const team = await createTestTeam(userId);
    
    // Verify team group exists
    const group = await dbPg.select().from(newTeamGroups).where(...);
    expect(group).toBeDefined();
    
    // Verify subteam exists
    const subteam = await dbPg.select().from(newTeamUnits).where(...);
    expect(subteam).toBeDefined();
    
    // Verify membership exists
    const membership = await dbPg.select().from(newTeamMemberships).where(...);
    expect(membership).toBeDefined();
  });
});
```

## Performance Testing

For performance-critical operations:

```typescript
it("should handle large roster efficiently", async () => {
  const startTime = Date.now();
  
  // Create many roster entries
  for (let i = 0; i < 100; i++) {
    await createRosterEntry(teamId, `Event${i}`, i, `Student${i}`);
  }
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
});
```

## Debugging Tests

### Enable Logging

```typescript
import logger from "@/lib/utils/logger";

it("should debug test", async () => {
  logger.info("Test data", { userId, teamId });
  // Test implementation
});
```

### Database Inspection

```typescript
it("should verify database state", async () => {
  const result = await dbPg.select().from(newTeamGroups).where(...);
  console.log("Database state:", result);
  // Test implementation
});
```

## Continuous Integration

Tests should run automatically in CI/CD:

```yaml
# .github/workflows/test.yml
- name: Run Teams Tests
  run: npm run test:teams-integration
```

## Coverage Goals

- **Unit Tests**: 80%+ coverage for utility functions
- **Integration Tests**: All critical workflows
- **E2E Tests**: All user-facing features

## Notes

- Tests use a separate test database
- All test data is cleaned up after tests
- Tests are isolated and can run in parallel
- Mock external services (email, notifications)
- Test both success and error paths


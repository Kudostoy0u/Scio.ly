# Teams API Routes - Business Logic Documentation

This document provides detailed business logic flows for all teams API routes. This serves as the single source of truth for understanding how each route works.

## Table of Contents

1. [Core Team Operations](#core-team-operations)
2. [Member Management](#member-management)
3. [Roster Management](#roster-management)
4. [Assignments](#assignments)
5. [Stream & Communication](#stream--communication)
6. [Calendar & Events](#calendar--events)
7. [Subteams](#subteams)

---

## Core Team Operations

### `POST /api/teams/create`

**Purpose:** Create a new team group with initial team unit.

**Business Logic Flow:**
1. Authenticate user (require valid session)
2. Validate request body:
   - `school` (required, non-empty string)
   - `division` (required, must be 'B' or 'C')
3. Generate unique slug: `${school.toLowerCase().replace(/\s+/g, "-")}-${division.toLowerCase()}-${timestamp}`
4. Ensure user has display name (auto-fill if missing):
   - Check Supabase users table
   - Derive from firstName/lastName, username, or email
   - Update both Supabase and CockroachDB
5. Create team group:
   - Insert into `new_team_groups` table
   - Use provided school, division, slug
   - Set `createdBy` to current user ID
   - Set `status` to 'active'
6. Create default team unit:
   - Insert into `new_team_units` table
   - Set `teamId` to 'A'
   - Generate unique `captainCode` and `userCode`
   - Link to created group
7. Create membership:
   - Insert into `new_team_memberships` table
   - Set `role` to 'captain'
   - Set `status` to 'active'
8. Return created team data with members

**Database Operations (Drizzle ORM):**
- `dbPg.insert(newTeamGroups).values(...).returning()`
- `dbPg.insert(newTeamUnits).values(...).returning()`
- `dbPg.insert(newTeamMemberships).values(...).returning()`

**Error Handling:**
- 401: Unauthorized (no user session)
- 400: Invalid input (missing school/division, invalid division)
- 500: Database error

---

### `GET /api/teams/user-teams`

**Purpose:** Get all teams the current user is a member of.

**Business Logic Flow:**
1. Authenticate user (require valid session)
2. Query user's team memberships:
   - Join `new_team_memberships` with `new_team_units` and `new_team_groups`
   - Filter by `userId` and `status = 'active'`
   - Include team group info (school, division, slug)
   - Include membership role and joinedAt
3. Format response with team details
4. Return array of teams

**Database Operations (Drizzle ORM):**
```typescript
await dbPg
  .select({
    id: newTeamGroups.id,
    school: newTeamGroups.school,
    division: newTeamGroups.division,
    slug: newTeamGroups.slug,
    role: newTeamMemberships.role,
    joinedAt: newTeamMemberships.joinedAt,
  })
  .from(newTeamGroups)
  .innerJoin(newTeamUnits, eq(newTeamGroups.id, newTeamUnits.groupId))
  .innerJoin(newTeamMemberships, eq(newTeamUnits.id, newTeamMemberships.teamId))
  .where(and(
    eq(newTeamMemberships.userId, user.id),
    eq(newTeamMemberships.status, "active")
  ));
```

**Error Handling:**
- 401: Unauthorized
- 500: Database error

---

## Member Management

### `GET /api/teams/[teamId]/members`

**Purpose:** Get all members of a team group, including linked and unlinked roster entries.

**Business Logic Flow:**
1. Authenticate user
2. Resolve team slug to group ID:
   - Query `new_team_groups` by slug
   - Return 404 if not found
3. Check team access:
   - Use `getTeamAccess()` utility
   - Verify user has access (member or roster entry)
   - Return 403 if no access
4. Add team creator if applicable:
   - Check if user is creator via `teamAccess.isCreator`
   - Add creator to members map with role 'creator'
5. Get subteam memberships:
   - Query `new_team_memberships` joined with `new_team_units`
   - Filter by `groupId` and `status = 'active'`
   - Optionally filter by `subteamId` if provided
6. Get user profiles:
   - Query `users` table for all member user IDs
   - Build user profile map
7. Build members list:
   - For each membership, add member with:
     - User profile data (name, email, username)
     - Role from membership
     - Subteam information
     - Events from roster (see step 8)
8. Get linked roster data:
   - Query `new_team_roster_data` where `userId IS NOT NULL`
   - Group by userId and teamUnitId
   - Map events to members
9. Get unlinked roster data:
   - Query `new_team_roster_data` where `userId IS NULL` and `studentName IS NOT NULL`
   - Create "unlinked" members with roster events
10. Get pending roster link invitations:
    - Query `roster_link_invitations` with `status = 'pending'`
    - Mark members with `hasPendingLinkInvite = true`
11. Set "Unknown team" for members without roster data
12. Return formatted members array

**Database Operations (Drizzle ORM):**
- Multiple queries using joins and filters
- Uses `isNotNull()`, `isNull()`, `eq()`, `and()` operators

**Error Handling:**
- 401: Unauthorized
- 400: Invalid subteamId format (must be UUID)
- 403: No team access
- 404: Team not found
- 500: Internal error

---

### `POST /api/teams/[teamId]/invite`

**Purpose:** Invite a user to join a team unit.

**Business Logic Flow:**
1. Authenticate user
2. Validate request:
   - Require `username` OR `email`
   - Optional `role` (default: 'member')
   - Optional `targetTeamUnitId`
3. Resolve team slug to team unit IDs
4. Check user permissions:
   - Query user's memberships in team units
   - Verify user is captain or co-captain
   - If `targetTeamUnitId` specified, verify permission for that unit
5. Find user to invite:
   - Query `users` table by username or email
   - Return 404 if user not found
6. Check if user already member:
   - Query `new_team_memberships` for user+team
   - Return 400 if already member
7. Create invitation:
   - Generate unique invitation code
   - Set expiration (default: 7 days)
   - Insert into `new_team_invitations` table
8. Send notification (if notification system enabled)
9. Return invitation details

**Database Operations (Drizzle ORM):**
- `dbPg.select().from(newTeamMemberships).where(...)`
- `dbPg.select().from(users).where(...)`
- `dbPg.insert(newTeamInvitations).values(...).returning()`

**Error Handling:**
- 401: Unauthorized
- 400: Missing username/email, already member, invalid team unit
- 403: Not captain/co-captain
- 404: Team not found, user not found
- 500: Database error

---

## Roster Management

### `GET /api/teams/[teamId]/roster`

**Purpose:** Get roster data for a specific subteam.

**Business Logic Flow:**
1. Authenticate user
2. Validate `subteamId` query parameter:
   - Must be provided
   - Must be valid UUID format
3. Resolve team slug to group ID:
   - Query `new_team_groups` by slug
   - Return 404 if not found
4. Check team access:
   - Use `checkTeamGroupAccessCockroach()` utility
   - Verify user has access (member or roster entry)
5. Query roster data:
   - Select from `new_team_roster_data` joined with `users`
   - Filter by `teamUnitId = subteamId`
   - Order by `eventName`, `slotIndex`
   - Use COALESCE for student name (prefer linked user display name)
6. Query removed events:
   - Select from `new_team_removed_events`
   - Filter by `teamUnitId = subteamId`
   - Order by `removedAt DESC`
7. Format roster:
   - Group by event name
   - Convert "and" to "&" in event names (frontend convention)
   - Build array structure: `{ [eventName]: [studentName, ...] }`
8. Return roster and removedEvents

**Database Operations (Drizzle ORM):**
```typescript
await dbPg
  .select({
    event_name: newTeamRosterData.eventName,
    slot_index: newTeamRosterData.slotIndex,
    student_name: sql<string>`COALESCE(${newTeamRosterData.studentName}, ${users.displayName}, ...)`,
    user_id: newTeamRosterData.userId,
  })
  .from(newTeamRosterData)
  .leftJoin(users, eq(newTeamRosterData.userId, users.id))
  .where(eq(newTeamRosterData.teamUnitId, subteamId))
  .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);
```

**Error Handling:**
- 401: Unauthorized
- 400: Missing/invalid subteamId
- 403: No team access
- 404: Team not found
- 500: Database error

---

### `POST /api/teams/[teamId]/roster`

**Purpose:** Save roster data for a subteam.

**Business Logic Flow:**
1. Authenticate user
2. Validate request:
   - Require `subteamId`, `eventName`, `slotIndex`
   - Validate UUID format for `subteamId`
   - Validate `slotIndex` is number between 0-10
   - Optional `studentName` and `userId`
3. Resolve team slug to group ID
4. Check team access
5. Check leadership access:
   - Use `checkTeamGroupLeadershipCockroach()` utility
   - Verify user is captain or co-captain
6. Verify subteam belongs to group:
   - Query `new_team_units` by `id` and `groupId`
   - Return 404 if not found or doesn't belong
7. Auto-link user if `studentName` provided:
   - Query team members by name
   - Match case-insensitively
   - Set `userIdToLink` if match found
8. Upsert roster data:
   - Use ON CONFLICT to update existing entries
   - Update `studentName`, `userId`, `updatedAt`
9. Return success

**Database Operations (Drizzle ORM):**
```typescript
await dbPg
  .insert(newTeamRosterData)
  .values({
    teamUnitId: subteamId,
    eventName: normalizedEventName,
    slotIndex: slotIndex,
    studentName: studentName || null,
    userId: userIdToLink,
    updatedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [newTeamRosterData.teamUnitId, newTeamRosterData.eventName, newTeamRosterData.slotIndex],
    set: {
      studentName: studentName || null,
      userId: userIdToLink,
      updatedAt: new Date(),
    },
  });
```

**Error Handling:**
- 401: Unauthorized
- 400: Invalid input, invalid UUID format
- 403: No access, not leadership
- 404: Team/subteam not found
- 500: Database error

---

## Assignments

### `GET /api/teams/[teamId]/assignments`

**Purpose:** Get all assignments for a team group.

**Business Logic Flow:**
1. Authenticate user
2. Resolve team slug to team unit IDs
3. Check team membership:
   - Query `new_team_memberships` for user
   - Return 403 if not member
4. Query assignments:
   - Select from `new_team_assignments` joined with `users` (creator)
   - Filter by `teamId IN (teamUnitIds)`
   - Order by `dueDate ASC`, `createdAt DESC`
5. For each assignment:
   - Get user's submission (latest)
   - Get roster assignments (who it's assigned to)
   - Get submission count (status IN ('submitted', 'graded'))
6. Format response with assignment details and metadata
7. Return assignments array

**Database Operations (Drizzle ORM):**
- Uses `inArray()` for team unit IDs
- Uses `inArray()` for status filtering (replaced raw SQL)
- Uses `ne()` for excluding creator (replaced raw SQL)

**Error Handling:**
- 401: Unauthorized
- 403: Not team member
- 404: Team not found
- 500: Database error

---

### `POST /api/teams/[teamId]/assignments`

**Purpose:** Create a new assignment.

**Business Logic Flow:**
1. Authenticate user
2. Validate request:
   - Require `title`
   - Optional: `description`, `assignment_type`, `due_date`, `questions`, etc.
3. Resolve team slug to team unit IDs
4. Check leadership access:
   - Use `hasLeadershipAccessCockroach()` utility
   - Verify user is captain, co-captain, or creator
5. Determine target team unit:
   - Use user's captain membership team, or first team unit
6. Create assignment:
   - Insert into `new_team_assignments` table
   - Set `createdBy` to current user
7. Save questions (if provided):
   - Validate all questions have valid `answers` array
   - Convert frontend format to database format:
     - MCQ: `answers: [0, 1]` → `correctAnswer: "A,B"`
     - FRQ: `answers: ["text"]` → `correctAnswer: "text"`
   - Insert into `new_team_assignment_questions` table
8. Return created assignment

**Database Operations (Drizzle ORM):**
- `dbPg.insert(newTeamAssignments).values(...).returning()`
- `dbPg.insert(newTeamAssignmentQuestions).values([...]).returning()`

**Error Handling:**
- 401: Unauthorized
- 400: Missing title, invalid questions
- 403: Not leadership
- 404: Team not found
- 500: Database error

---

## Stream & Communication

### `GET /api/teams/[teamId]/stream`

**Purpose:** Get stream posts for a subteam.

**Business Logic Flow:**
1. Authenticate user
2. Validate `subteamId` query parameter (must be UUID)
3. Resolve team slug to group ID
4. Check team access
5. Query stream posts:
   - Select from `new_team_stream_posts`
   - Join with `users` (author) and `new_team_events` (tournament)
   - Filter by `teamUnitId = subteamId`
   - Order by `createdAt DESC`
6. Query comments for each post:
   - Select from `new_team_stream_comments`
   - Join with `users` (author)
   - Filter by `postId`
7. Format response with posts and comments
8. Return stream data

**Database Operations (Drizzle ORM):**
- Multiple queries with joins
- Should replace `queryCockroachDB` with Drizzle ORM

**Error Handling:**
- 401: Unauthorized
- 400: Invalid subteamId
- 403: No team access
- 404: Team not found
- 500: Database error

---

### `POST /api/teams/[teamId]/stream`

**Purpose:** Create a new stream post.

**Business Logic Flow:**
1. Authenticate user
2. Validate request:
   - Require `content`
   - Optional: `tournamentId`, `attachmentUrl`, `attachmentTitle`
3. Resolve team slug to group ID
4. Check team membership
5. Verify leadership (captain/co-captain)
6. If `tournamentId` provided:
   - Verify tournament exists and belongs to team
7. Create post:
   - Insert into `new_team_stream_posts` table
   - Set `authorId` to current user
8. Return created post

**Database Operations (Drizzle ORM):**
- `dbPg.insert(newTeamStreamPosts).values(...).returning()`

**Error Handling:**
- 401: Unauthorized
- 400: Missing content, invalid tournament
- 403: Not leadership
- 404: Team/tournament not found
- 500: Database error

---

## Calendar & Events

### `GET /api/teams/calendar/events`

**Purpose:** Get calendar events for user's teams.

**Business Logic Flow:**
1. Authenticate user
2. Get user's teams (via `getUserTeams`)
3. Query events:
   - Select from `new_team_events`
   - Filter by `teamId IN (userTeamIds)`
   - Optionally filter by date range
4. Format and return events

**Database Operations (Drizzle ORM):**
- Should replace `queryCockroachDB` with Drizzle ORM

**Error Handling:**
- 401: Unauthorized
- 500: Database error

---

## Subteams

### `GET /api/teams/[teamId]/subteams`

**Purpose:** Get all subteams for a team group.

**Business Logic Flow:**
1. Authenticate user
2. Resolve team slug to group ID
3. Check team access
4. Query subteams:
   - Select from `new_team_units`
   - Filter by `groupId` and `status = 'active'`
   - Order by `createdAt`
5. Format response (use `description` as name, fallback to `Team ${teamId}`)
6. Return subteams array

**Database Operations (Drizzle ORM):**
```typescript
await dbPg
  .select({
    id: newTeamUnits.id,
    teamId: newTeamUnits.teamId,
    description: newTeamUnits.description,
    createdAt: newTeamUnits.createdAt,
  })
  .from(newTeamUnits)
  .where(and(
    eq(newTeamUnits.groupId, groupId),
    eq(newTeamUnits.status, "active")
  ))
  .orderBy(newTeamUnits.createdAt);
```

**Error Handling:**
- 401: Unauthorized
- 403: No team access
- 404: Team not found
- 500: Database error

---

### `POST /api/teams/[teamId]/subteams`

**Purpose:** Create a new subteam.

**Business Logic Flow:**
1. Authenticate user
2. Validate request:
   - Require `name`
   - Optional `description`
3. Resolve team slug to group ID
4. Check leadership access (captain/co-captain or creator)
5. Generate next available team ID:
   - Query all existing `teamId` values for group
   - Start with 'A', increment to 'B', 'C', etc.
   - If past 'Z', use 'T1', 'T2', etc.
6. Generate unique codes:
   - `captainCode`: `CAP${random}`
   - `userCode`: `USR${random}`
7. Create subteam:
   - Insert into `new_team_units` table
   - Use generated `teamId` and codes
8. Return created subteam

**Database Operations (Drizzle ORM):**
- `dbPg.select({ teamId: newTeamUnits.teamId }).from(newTeamUnits).where(...)`
- `dbPg.insert(newTeamUnits).values(...).returning()`

**Error Handling:**
- 401: Unauthorized
- 400: Missing name
- 403: Not leadership
- 404: Team not found
- 500: Database error

---

## Notes

- All routes should use Drizzle ORM, not raw SQL
- All routes should import from `@/lib/db/schema`
- All routes should validate input and handle errors properly
- Authentication is required for all routes
- Team access checks should use utility functions from `@/lib/utils/team-auth-v2`

## Migration Status

**Completed:**
- ✅ Assignment routes (GET/POST) - Raw SQL replaced with Drizzle ORM
- ✅ Subteam assignment routes - Raw SQL replaced with Drizzle ORM
- ✅ tRPC router - Raw SQL replaced with Drizzle ORM

**Pending:**
- ⚠️ Roster routes - Still uses `queryCockroachDB` (needs migration)
- ⚠️ Stream routes - Still uses `queryCockroachDB` (needs migration)
- ⚠️ Calendar routes - Still uses `queryCockroachDB` (needs migration)
- ⚠️ Timer routes - Still uses `queryCockroachDB` (needs migration)
- ⚠️ Invite routes - Still uses `queryCockroachDB` (needs migration)


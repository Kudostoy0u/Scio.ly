# Teams Feature - Raw SQL to Drizzle ORM Migration Progress

This document tracks the migration of all teams routes from raw SQL (`queryCockroachDB`) to Drizzle ORM.

## Migration Status

### ✅ Completed Routes (15 routes migrated)

1. **Assignment Routes (4 routes)**
   - ✅ `GET /api/teams/[teamId]/assignments` - All raw SQL replaced
   - ✅ `POST /api/teams/[teamId]/assignments` - All raw SQL replaced
   - ✅ `POST /api/teams/[teamId]/subteams/[subteamId]/assignments` - All raw SQL replaced
   - ✅ `POST /api/teams/[teamId]/subteams/[subteamId]/assignments/codebusters` - All raw SQL replaced

2. **Roster Routes (2 routes)**
   - ✅ `GET /api/teams/[teamId]/roster` - All raw SQL replaced with Drizzle ORM
   - ✅ `POST /api/teams/[teamId]/roster` - All raw SQL replaced with Drizzle ORM

3. **Stream Routes (4 routes)**
   - ✅ `GET /api/teams/[teamId]/stream` - All raw SQL replaced with Drizzle ORM
   - ✅ `POST /api/teams/[teamId]/stream` - All raw SQL replaced with Drizzle ORM
   - ✅ `PUT /api/teams/[teamId]/stream` - All raw SQL replaced with Drizzle ORM
   - ✅ `DELETE /api/teams/[teamId]/stream` - All raw SQL replaced with Drizzle ORM

4. **Stream Comments Routes (2 routes)**
   - ✅ `POST /api/teams/[teamId]/stream/comments` - All raw SQL replaced with Drizzle ORM
   - ✅ `DELETE /api/teams/[teamId]/stream/comments` - All raw SQL replaced with Drizzle ORM

5. **Subteam Routes (2 routes)**
   - ✅ `PUT /api/teams/[teamId]/subteams/[subteamId]` - All raw SQL replaced with Drizzle ORM (uses transaction)
   - ✅ `DELETE /api/teams/[teamId]/subteams/[subteamId]` - All raw SQL replaced with Drizzle ORM (uses transaction)

6. **tRPC Router (1 route)**
   - ✅ `src/lib/trpc/routers/teams.ts` - Raw SQL replaced with Drizzle operators

### ⚠️ Pending Routes

The following routes still use `queryCockroachDB` and need migration:

1. **Stream Routes**
   - ⚠️ `GET /api/teams/[teamId]/stream`
   - ⚠️ `POST /api/teams/[teamId]/stream`
   - ⚠️ `PUT /api/teams/[teamId]/stream`
   - ⚠️ `DELETE /api/teams/[teamId]/stream`
   - ⚠️ `GET /api/teams/[teamId]/stream/comments`
   - ⚠️ `POST /api/teams/[teamId]/stream/comments`
   - ⚠️ `DELETE /api/teams/[teamId]/stream/comments`

2. **Calendar Routes**
   - ⚠️ `GET /api/teams/calendar/events`
   - ⚠️ `POST /api/teams/calendar/events`
   - ⚠️ `GET /api/teams/calendar/events/[eventId]`
   - ⚠️ `PUT /api/teams/calendar/events/[eventId]`
   - ⚠️ `DELETE /api/teams/calendar/events/[eventId]`
   - ⚠️ `GET /api/teams/calendar/recurring-meetings`
   - ⚠️ `POST /api/teams/calendar/recurring-meetings`
   - ⚠️ `PUT /api/teams/calendar/recurring-meetings`
   - ⚠️ `DELETE /api/teams/calendar/recurring-meetings`
   - ⚠️ `GET /api/teams/calendar/personal`

3. **Timer Routes**
   - ⚠️ `GET /api/teams/[teamId]/timers`
   - ⚠️ `POST /api/teams/[teamId]/timers`
   - ⚠️ `DELETE /api/teams/[teamId]/timers`

4. **Invite Routes**
   - ⚠️ `POST /api/teams/[teamId]/invite`
   - ⚠️ `POST /api/teams/[teamId]/invite/cancel`

5. **Subteam Routes**
   - ⚠️ `GET /api/teams/[teamId]/subteams/[subteamId]`
   - ⚠️ `PUT /api/teams/[teamId]/subteams/[subteamId]`
   - ⚠️ `DELETE /api/teams/[teamId]/subteams/[subteamId]` (many DELETE statements)

6. **Other Routes**
   - ⚠️ `GET /api/teams/[teamId]/tournaments`
   - ⚠️ `GET /api/teams/notifications`
   - ⚠️ `POST /api/teams/notifications`
   - ⚠️ Various roster invitation routes

## Migration Patterns

### Pattern 1: Simple SELECT

**Before (Raw SQL):**
```typescript
const result = await queryCockroachDB<{ id: string }>(
  "SELECT id FROM new_team_groups WHERE slug = $1",
  [teamId]
);
const groupId = result.rows[0]?.id;
```

**After (Drizzle ORM):**
```typescript
const result = await dbPg
  .select({ id: newTeamGroups.id })
  .from(newTeamGroups)
  .where(eq(newTeamGroups.slug, teamId))
  .limit(1);
const groupId = result[0]?.id;
```

### Pattern 2: JOIN Queries

**Before (Raw SQL):**
```typescript
const result = await queryCockroachDB(
  `SELECT u.id, u.display_name, tm.role
   FROM users u
   JOIN new_team_memberships tm ON u.id = tm.user_id
   WHERE tm.team_id = $1`,
  [teamId]
);
```

**After (Drizzle ORM):**
```typescript
const result = await dbPg
  .select({
    id: users.id,
    display_name: users.displayName,
    role: newTeamMemberships.role,
  })
  .from(users)
  .innerJoin(newTeamMemberships, eq(users.id, newTeamMemberships.userId))
  .where(eq(newTeamMemberships.teamId, teamId));
```

### Pattern 3: UPSERT Operations

**Before (Raw SQL):**
```typescript
await queryCockroachDB(
  `INSERT INTO new_team_roster_data (team_unit_id, event_name, slot_index, student_name, user_id)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (team_unit_id, event_name, slot_index)
   DO UPDATE SET student_name = $4, user_id = $5`,
  [subteamId, eventName, slotIndex, studentName, userId]
);
```

**After (Drizzle ORM):**
```typescript
await dbPg
  .insert(newTeamRosterData)
  .values({
    teamUnitId: subteamId,
    eventName: eventName,
    slotIndex: slotIndex,
    studentName: studentName,
    userId: userId,
    updatedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [
      newTeamRosterData.teamUnitId,
      newTeamRosterData.eventName,
      newTeamRosterData.slotIndex,
    ],
    set: {
      studentName: studentName,
      userId: userId,
      updatedAt: new Date(),
    },
  });
```

### Pattern 4: Complex WHERE Conditions

**Before (Raw SQL):**
```typescript
const result = await queryCockroachDB(
  `SELECT * FROM new_team_units
   WHERE id = $1 AND group_id = $2 AND status = 'active'`,
  [subteamId, groupId]
);
```

**After (Drizzle ORM):**
```typescript
const result = await dbPg
  .select()
  .from(newTeamUnits)
  .where(
    and(
      eq(newTeamUnits.id, subteamId),
      eq(newTeamUnits.groupId, groupId),
      eq(newTeamUnits.status, "active")
    )
  );
```

## Common Drizzle Operators

- `eq(column, value)` - Equality check
- `ne(column, value)` - Not equal
- `and(...conditions)` - AND conditions
- `or(...conditions)` - OR conditions
- `inArray(column, array)` - IN clause
- `isNotNull(column)` - IS NOT NULL
- `isNull(column)` - IS NULL
- `desc(column)` - ORDER BY DESC
- `asc(column)` - ORDER BY ASC
- `sql`template`` - For complex SQL (use sparingly)

## Schema References

Always import from centralized schema:
```typescript
import {
  newTeamGroups,
  newTeamUnits,
  newTeamMemberships,
  newTeamRosterData,
  newTeamRemovedEvents,
  newTeamStreamPosts,
  newTeamStreamComments,
  newTeamEvents,
  newTeamActiveTimers,
  newTeamRecurringMeetings,
  users,
} from "@/lib/db/schema";
```

## Next Steps

1. Migrate stream routes (high priority - commonly used)
2. Migrate calendar routes (high priority - core feature)
3. Migrate timer routes (medium priority)
4. Migrate invite routes (medium priority)
5. Migrate remaining routes (lower priority)

## Testing After Migration

After migrating each route:
1. Test all CRUD operations
2. Verify error handling
3. Check performance (should be similar or better)
4. Update tests if needed
5. Update documentation


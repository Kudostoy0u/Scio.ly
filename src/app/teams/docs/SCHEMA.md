# Teams Database Schema Reference

This document provides a complete reference for all teams-related database tables and their fields. All operations should use Drizzle ORM and reference this schema to prevent hallucinations about database structure.

## Schema Location

All teams schema definitions are located in:
- `src/lib/db/schema/teams.ts` - Primary teams schema file
- `src/lib/db/schema.ts` - Main schema file (contains some team tables)

**Always import from `@/lib/db/schema` to ensure you're using the centralized schema.**

## Core Tables

### `new_team_groups`
Top-level team organization (school/division groups).

**Fields:**
- `id` (UUID, PK) - Primary key
- `school` (TEXT, NOT NULL) - School name
- `division` (VARCHAR(1), NOT NULL) - Division ('B' or 'C')
- `slug` (TEXT, UNIQUE, NOT NULL) - Unique slug identifier
- `description` (TEXT) - Optional description
- `createdBy` (UUID, NOT NULL) - Creator user ID
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- `settings` (JSONB) - Team settings
- `status` (TEXT) - Status ('active', 'archived', 'deleted')

### `new_team_units`
Individual teams within a group (subteams A, B, C, etc.).

**Fields:**
- `id` (UUID, PK) - Primary key
- `groupId` (UUID, NOT NULL, FK → new_team_groups.id) - Parent group
- `teamId` (TEXT, NOT NULL) - Team identifier ('A', 'B', 'C', etc.)
- `description` (TEXT) - Team description/name
- `captainCode` (TEXT, UNIQUE, NOT NULL) - Captain invitation code
- `userCode` (TEXT, UNIQUE, NOT NULL) - Regular user invitation code
- `createdBy` (UUID, NOT NULL) - Creator user ID
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- `settings` (JSONB) - Team unit settings
- `status` (TEXT) - Status ('active', 'archived', 'deleted')

**Constraints:**
- UNIQUE(groupId, teamId) - No duplicate team IDs within a group

### `new_team_memberships`
User-team relationships with roles.

**Fields:**
- `id` (UUID, PK) - Primary key
- `userId` (UUID, NOT NULL, FK → users.id) - User ID
- `teamId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `role` (TEXT, NOT NULL) - Role ('captain', 'co_captain', 'member', 'observer')
- `joinedAt` (TIMESTAMP) - Join timestamp
- `invitedBy` (UUID, FK → users.id) - User who sent invitation
- `status` (TEXT) - Status ('active', 'inactive', 'pending', 'banned')
- `permissions` (JSONB) - Additional permissions

**Constraints:**
- UNIQUE(userId, teamId) - One membership per user per team

## Roster Tables

### `new_team_roster_data`
Student roster information for teams.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamUnitId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `eventName` (TEXT, NOT NULL) - Event name
- `slotIndex` (BIGINT, NOT NULL) - Slot index (0-10)
- `studentName` (TEXT) - Student name (for unlinked entries)
- `userId` (UUID, FK → users.id) - Linked user ID (null if unlinked)
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

**Constraints:**
- UNIQUE(teamUnitId, eventName, slotIndex) - One student per slot per event

### `new_team_removed_events`
Events removed from conflict blocks.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamUnitId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `eventName` (TEXT, NOT NULL) - Event name
- `conflictBlock` (TEXT, NOT NULL) - Conflict block identifier
- `removedBy` (UUID, NOT NULL, FK → users.id) - User who removed it
- `removedAt` (TIMESTAMP) - Removal timestamp

**Constraints:**
- UNIQUE(teamUnitId, eventName) - One removal record per event per team

### `roster_link_invitations`
Invitations to link roster entries to user accounts.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `studentName` (TEXT, NOT NULL) - Student name from roster
- `invitedUserId` (UUID, NOT NULL, FK → users.id) - User being invited
- `invitedBy` (UUID, NOT NULL, FK → users.id) - User sending invitation
- `status` (TEXT) - Status ('pending', 'accepted', 'declined', 'expired')
- `createdAt` (TIMESTAMP) - Creation timestamp
- `expiresAt` (TIMESTAMP, NOT NULL) - Expiration timestamp
- `message` (TEXT) - Optional message

## Stream Tables

### `new_team_stream_posts`
Team stream posts from captains/leaders.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamUnitId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `authorId` (UUID, NOT NULL, FK → users.id) - Author user ID
- `content` (TEXT, NOT NULL) - Post content
- `showTournamentTimer` (BOOLEAN) - Show tournament countdown timer
- `tournamentId` (UUID, FK → new_team_events.id) - Associated tournament event
- `attachmentUrl` (TEXT) - Attachment URL
- `attachmentTitle` (TEXT) - Attachment title
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

### `new_team_stream_comments`
Comments on stream posts.

**Fields:**
- `id` (UUID, PK) - Primary key
- `postId` (UUID, NOT NULL, FK → new_team_stream_posts.id) - Post ID
- `authorId` (UUID, NOT NULL, FK → users.id) - Comment author
- `content` (TEXT, NOT NULL) - Comment content
- `createdAt` (TIMESTAMP) - Creation timestamp

## Calendar & Events Tables

### `new_team_events`
Calendar events for teams.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `createdBy` (UUID, NOT NULL, FK → users.id) - Creator user ID
- `title` (TEXT, NOT NULL) - Event title
- `description` (TEXT) - Event description
- `eventType` (TEXT) - Event type ('practice', 'tournament', 'meeting', 'deadline', 'other')
- `startTime` (TIMESTAMP, NOT NULL) - Start time
- `endTime` (TIMESTAMP) - End time
- `location` (TEXT) - Location
- `isAllDay` (BOOLEAN) - All-day event flag
- `isRecurring` (BOOLEAN) - Recurring event flag
- `recurrencePattern` (JSONB) - Recurrence pattern
- `reminderMinutes` (JSONB) - Reminder minutes array
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

### `new_team_recurring_meetings`
Recurring meeting definitions.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `createdBy` (UUID, NOT NULL, FK → users.id) - Creator user ID
- `title` (TEXT, NOT NULL) - Meeting title
- `description` (TEXT) - Meeting description
- `location` (TEXT) - Meeting location
- `daysOfWeek` (JSONB, NOT NULL) - Array of day numbers (0=Sunday, 1=Monday, etc.)
- `startTime` (TEXT, NOT NULL) - Start time (HH:MM format)
- `endTime` (TEXT, NOT NULL) - End time (HH:MM format)
- `exceptions` (JSONB) - Array of dates to skip (YYYY-MM-DD format)
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

### `new_team_active_timers`
Active countdown timers for events.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamUnitId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `eventId` (UUID, NOT NULL, FK → new_team_events.id) - Event ID
- `addedBy` (UUID, NOT NULL, FK → users.id) - User who added timer
- `addedAt` (TIMESTAMP) - Addition timestamp

**Constraints:**
- UNIQUE(teamUnitId, eventId) - One timer per event per team

## Invitation Tables

### `new_team_invitations`
Pending invitations to join teams.

**Fields:**
- `id` (UUID, PK) - Primary key
- `teamId` (UUID, NOT NULL, FK → new_team_units.id) - Team unit ID
- `invitedBy` (UUID, NOT NULL, FK → users.id) - User sending invitation
- `email` (TEXT, NOT NULL) - Invitee email
- `role` (TEXT, NOT NULL) - Invited role
- `invitationCode` (TEXT, NOT NULL, UNIQUE) - Unique invitation code
- `expiresAt` (TIMESTAMP, NOT NULL) - Expiration timestamp
- `status` (TEXT) - Status ('pending', 'accepted', 'declined', 'expired')
- `createdAt` (TIMESTAMP) - Creation timestamp
- `acceptedAt` (TIMESTAMP) - Acceptance timestamp
- `message` (TEXT) - Optional message

## Usage Guidelines

1. **Always use Drizzle ORM** - Never use raw SQL queries
2. **Import from centralized schema** - Use `@/lib/db/schema` imports
3. **Reference this document** - Check field names and types here
4. **Respect constraints** - Follow UNIQUE and foreign key constraints
5. **Use proper types** - Match TypeScript types to database types

## Common Operations

### Querying Teams
```typescript
import { dbPg } from "@/lib/db";
import { newTeamGroups, newTeamUnits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Get team group by slug
const group = await dbPg
  .select()
  .from(newTeamGroups)
  .where(eq(newTeamGroups.slug, teamSlug))
  .limit(1);
```

### Joining Related Data
```typescript
import { newTeamUnits, newTeamMemberships, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Get members with user data
const members = await dbPg
  .select({
    userId: newTeamMemberships.userId,
    role: newTeamMemberships.role,
    email: users.email,
    displayName: users.displayName,
  })
  .from(newTeamMemberships)
  .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
  .leftJoin(users, eq(newTeamMemberships.userId, users.id))
  .where(and(
    eq(newTeamUnits.groupId, groupId),
    eq(newTeamMemberships.status, "active")
  ));
```

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- UUIDs are used for all primary keys
- JSONB is used for flexible data storage
- Foreign keys use CASCADE deletes where appropriate
- Status fields use text enums (not database enums for flexibility)


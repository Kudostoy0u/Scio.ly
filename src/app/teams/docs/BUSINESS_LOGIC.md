# Teams Feature - Business Logic Summary

This document provides a high-level overview of the teams feature business logic and workflows.

## Core Concepts

### Team Hierarchy

1. **Team Group** (`new_team_groups`)
   - Top-level organization
   - Represents a school/division combination
   - Has a unique slug identifier
   - Contains multiple team units

2. **Team Unit** (`new_team_units`)
   - Individual teams within a group (A, B, C, etc.)
   - Each has unique captain and user invitation codes
   - Can have multiple members
   - Has roster data for events

3. **Membership** (`new_team_memberships`)
   - Links users to team units
   - Has roles: 'captain', 'co_captain', 'member', 'observer'
   - Has status: 'active', 'inactive', 'pending', 'banned'

### Access Control

**Team Access Levels:**
1. **Creator** - User who created the team group (highest level)
2. **Captain** - Can manage team, invite members, create assignments
3. **Co-Captain** - Similar to captain, can manage team
4. **Member** - Can view team data, participate in assignments
5. **Observer** - Read-only access

**Access Checks:**
- Use `getTeamAccess()` utility for general access
- Use `hasLeadershipAccessCockroach()` for leadership operations
- Use `checkTeamGroupAccessCockroach()` for basic access
- Use `checkTeamGroupLeadershipCockroach()` for leadership access

### Roster System

**Roster Data Structure:**
- Organized by event name and slot index (0-10)
- Can be linked to user accounts (`userId` not null)
- Can be unlinked (only `studentName` provided)
- Supports conflict blocks (events that conflict)

**Roster Linking:**
- Captains can link roster entries to user accounts
- Creates `roster_link_invitations` for pending links
- Users can accept/decline link invitations
- Unlinked entries show as "unlinked" members

### Assignment System

**Assignment Flow:**
1. Captain creates assignment with questions
2. Assignment is assigned to roster members
3. Members receive notifications
4. Members submit answers
5. Submissions are graded (optional)
6. Results are tracked

**Question Format:**
- Frontend sends: `{ answers: [0], question_text: "...", question_type: "multiple_choice" }`
- Backend stores: `{ correct_answer: "A", question_text: "...", question_type: "multiple_choice" }`
- MCQ: Converts numeric indices to letters (0→A, 1→B, etc.)
- FRQ: Stores answers as-is

### Stream System

**Stream Posts:**
- Captains/co-captains can post to team stream
- Can include tournament timers
- Can have attachments
- Members can comment on posts

**Active Timers:**
- Captains can add countdown timers for events
- Timers display on team stream
- Stored in `new_team_active_timers` table

### Calendar System

**Events:**
- Team events stored in `new_team_events`
- Can be practice, tournament, meeting, deadline, or other
- Support recurring patterns
- Have reminders

**Recurring Meetings:**
- Defined in `new_team_recurring_meetings`
- Specify days of week and time
- Can have exceptions (dates to skip)
- Generate individual events from pattern

## Key Workflows

### Team Creation Workflow

1. User provides school and division
2. System generates unique slug
3. System ensures user has display name
4. Creates team group
5. Creates default team unit (Team A)
6. Creates membership for creator (role: captain)
7. Returns team data

### Member Invitation Workflow

1. Captain provides username/email and role
2. System finds user by username/email
3. System checks if user already member
4. System creates invitation record
5. System generates invitation code
6. System sends notification (if enabled)
7. User accepts invitation via code
8. System creates membership

### Roster Management Workflow

1. Captain opens roster tab
2. System loads roster data for subteam
3. Captain edits roster entries
4. System auto-links entries to team members (by name match)
5. Captain can manually link entries
6. System saves roster data
7. Unlinked entries show as "unlinked" members

### Assignment Creation Workflow

1. Captain creates assignment with title, description, due date
2. Captain adds questions (optional)
3. System validates all questions have answers
4. System converts question format (frontend → database)
5. Captain selects roster members to assign
6. System creates assignment record
7. System creates question records
8. System creates roster assignment records
9. System sends notifications to assigned members

## Data Flow Patterns

### Reading Team Data

1. Resolve slug to group ID
2. Check user access
3. Query related data (members, roster, assignments, etc.)
4. Join with user profiles
5. Format and return

### Writing Team Data

1. Authenticate user
2. Validate input
3. Resolve slug to group ID
4. Check permissions
5. Perform database operation
6. Return result

### Error Handling Pattern

```typescript
try {
  // Validate input
  if (!requiredField) {
    return NextResponse.json({ error: "Field required" }, { status: 400 });
  }
  
  // Authenticate
  const user = await getServerUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check access
  const access = await getTeamAccess(user.id, groupId);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Perform operation
  const result = await dbPg.insert(...);
  
  return NextResponse.json(result);
} catch (error) {
  logger.error("Error:", error);
  return NextResponse.json(
    { error: "Internal server error", details: error.message },
    { status: 500 }
  );
}
```

## Best Practices

1. **Always use Drizzle ORM** - Never use raw SQL
2. **Import from centralized schema** - Use `@/lib/db/schema`
3. **Use utility functions** - Don't duplicate access check logic
4. **Validate input** - Check all required fields and formats
5. **Handle errors gracefully** - Return appropriate status codes
6. **Log important operations** - Use logger for debugging
7. **Respect permissions** - Always check access before operations
8. **Use transactions** - For multi-step operations
9. **Format responses consistently** - Follow established patterns
10. **Document business logic** - Update this doc when logic changes

## Common Patterns

### Resolving Team Slug

```typescript
const groupResult = await dbPg
  .select({ id: newTeamGroups.id })
  .from(newTeamGroups)
  .where(eq(newTeamGroups.slug, teamId))
  .limit(1);

if (groupResult.length === 0) {
  return NextResponse.json({ error: "Team not found" }, { status: 404 });
}

const groupId = groupResult[0]?.id;
```

### Checking Team Access

```typescript
const teamAccess = await getTeamAccess(user.id, groupId);
if (!teamAccess.hasAccess) {
  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}
```

### Getting Team Unit IDs

```typescript
const teamInfo = await resolveTeamSlugToUnits(teamId);
// teamInfo.groupId - The group ID
// teamInfo.teamUnitIds - Array of team unit IDs in the group
```

### Formatting Display Names

```typescript
import { generateDisplayName } from "@/lib/utils/displayNameUtils";

const { name } = generateDisplayName(userProfile, userId);
// Handles: displayName → firstName + lastName → firstName → lastName → username → fallback
```


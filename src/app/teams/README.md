# Teams Directory

This directory contains the comprehensive team management system for the Scio.ly platform. Provides team creation, member management, assignments, calendar, leaderboards, and collaboration tools.

## Files

### `page.tsx`
Server component that handles team page routing and auto-redirects to user's primary team.

**Key Features:**
- Auto-detects user's primary team
- Redirects to team slug if available
- Supports `?view=all` parameter to view all teams
- Handles team unlinking cookie

**Example:**
```60:109:src/app/teams/page.tsx
export default async function TeamsPage(ctx: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const justUnlinked = cookieStore.get("teamsJustUnlinked");
  const auto = await getAutoLinkSelection();
  const searchParams = await ctx.searchParams;
  const viewAll = searchParams.view === "all";

  // Only redirect if we have a valid team slug, user hasn't just unlinked, and user doesn't explicitly want to view all teams
  if (!(justUnlinked || viewAll) && auto?.slug) {
    // Double-check that the team actually exists in the new system
    try {
      const { dbPg } = await import("@/lib/db");
      const { newTeamGroups } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const groupResult = await dbPg
        .select({ id: newTeamGroups.id })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, auto.slug));

      if (groupResult.length > 0) {
        redirect(`/teams/${auto.slug}`);
      }
    } catch (error) {
      // Handle redirect errors
    }
  }

  return (
    <TeamsPageClient
      initialLinkedSelection={auto ? {...} : null}
      initialGroupSlug={auto?.slug || null}
    />
  );
}
```

**Important Notes:**
- Uses Drizzle ORM to query team memberships
- Finds user's primary team (most recent active membership)
- Redirects to team page if found
- Supports viewing all teams with `?view=all` parameter

## Subdirectories

### `[slug]/`
Dynamic route for individual team pages.

**Files:**
- `page.tsx` - Team page server component
- `TeamSlugClient.tsx` - Team page client component
- `assignments/page.tsx` - Team assignments page
- `people/page.tsx` - Team people/roster page
- `stream/page.tsx` - Team activity stream page

**Features:**
- Team dashboard
- Assignments management
- People/roster management
- Activity stream
- Calendar integration

### `components/`
Comprehensive team components directory.

**Key Components:**
- `TeamsPageClient.tsx` - Main teams page client
- `TeamsLanding.tsx` - Teams landing page
- `CreateTeamModal.tsx` - Team creation modal
- `JoinTeamModal.tsx` - Join team modal
- `TeamCard.tsx` - Team card display
- `TeamDashboard.tsx` - Team dashboard component
- `TeamLayout.tsx` - Team page layout
- `PeopleTab.tsx` - People/roster tab
- `RosterTab.tsx` - Roster management tab
- `AssignmentsTab.tsx` - Assignments tab
- `StreamTab.tsx` - Activity stream tab
- `Leaderboard.tsx` - Team leaderboard
- `TeamCalendar.tsx` - Team calendar component
- `NotificationBell.tsx` - Notification bell component

**Assignment Components:**
- `EnhancedAssignmentCreator.tsx` - Assignment creation
- `CodebustersAssignmentCreator.tsx` - Codebusters-specific creator
- `AssignmentViewer.tsx` - Assignment viewing
- `AssignmentDetailsStep.tsx` - Assignment details step
- `QuestionGenerationStep.tsx` - Question generation step
- `QuestionPreviewStep.tsx` - Question preview step
- `RosterSelectionStep.tsx` - Roster selection step

**Calendar Components:**
- `calendar/CalendarGrid.tsx` - Calendar grid display
- `calendar/CalendarHeader.tsx` - Calendar header
- `calendar/EventModal.tsx` - Event modal
- `calendar/EventList.tsx` - Event list
- `calendar/RecurringMeetingModal.tsx` - Recurring meetings
- `calendar/SettingsModal.tsx` - Calendar settings

**Stream Components:**
- `stream/StreamPosts.tsx` - Stream posts display
- `stream/PostCreator.tsx` - Post creation
- `stream/TimerManager.tsx` - Timer management
- `stream/ActiveTimers.tsx` - Active timers display

**Leaderboard Components:**
- `leaderboard/` - Leaderboard-specific components

**Roster Components:**
- `roster/RosterHeader.tsx` - Roster header
- `roster/EventInput.tsx` - Event input
- `roster/SubteamSelector.tsx` - Subteam selection
- `roster/ConflictBlock.tsx` - Conflict detection

### `assign/`
Team assignment viewing page.

**Files:**
- `page.tsx` - Assignment page

### `invites/`
Team invitation management.

**Files:**
- `page.tsx` - Invites page
- `README.md` - Invites documentation

### `calendar/`
Team calendar page.

**Files:**
- `page.tsx` - Calendar page

### `archived/`
Archived teams page.

**Files:**
- `page.tsx` - Archived teams page
- `ArchivedTeamsClient.tsx` - Archived teams client component

### `results/`
Team results page.

**Files:**
- `page.tsx` - Results page
- `README.md` - Results documentation

### `docs/`
Team system documentation.

**Files:**
- `API_ROUTES.md` - API routes documentation
- `BUSINESS_LOGIC.md` - Business logic documentation
- `FLOWCHARTS.md` - Flowchart documentation
- `SCHEMA.md` - Database schema documentation
- `TESTING.md` - Testing documentation
- `README.md` - Documentation overview

### `constants/`
Team constants.

**Files:**
- `divisionGroups.ts` - Division group definitions

### `types/`
TypeScript type definitions.

**Files:**
- `index.ts` - Team type definitions

### `utils/`
Team utility functions.

**Files:**
- `displayNameUtils.ts` - Display name utilities

## Important Notes

1. **Team Structure**: Uses groups, units, and memberships structure
2. **Auto-Redirect**: Automatically redirects to user's primary team
3. **Slug-Based Routing**: Teams accessed via slug URLs
4. **Assignment System**: Comprehensive assignment creation and management
5. **Calendar Integration**: Full calendar system for team events
6. **Activity Stream**: Real-time activity stream for team updates
7. **Leaderboards**: Team-specific leaderboards
8. **Roster Management**: Advanced roster management with conflict detection
9. **Notifications**: Real-time notification system
10. **Theme Support**: Dark/light mode support throughout

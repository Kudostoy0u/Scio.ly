# Teams Feature Refactoring Plan

## Overview
This document outlines the refactoring strategy for all teams-related files over 600 lines.

## Completed
✅ **src/lib/trpc/routers/teams.ts** (2,602 lines → 6 files, all <600 lines)
- Split into operations: basic-queries, dashboard-queries, team-mutations, subteam-operations, roster-operations, member-operations
- Main router: 61 lines
- Largest file: 530 lines

## In Progress

### 1. src/lib/stores/teamStore.ts (1,228 lines)

**Strategy:** Split into modular architecture

**New Structure:**
```
src/lib/stores/teams/
├── types.ts (230 lines) ✅ Created
├── client.ts (25 lines) ✅ Created
├── utils.ts (35 lines) ✅ Created
├── actions/
│   ├── fetch-actions.ts (~300 lines) - All fetch* methods
│   ├── update-actions.ts (~150 lines) - All update* methods
│   └── optimistic-actions.ts (~150 lines) - Optimistic updates
└── index.ts (~150 lines) - Main store combining all
```

**Files to create:**
- [x] `teams/types.ts` - All interfaces and type definitions
- [x] `teams/client.ts` - tRPC client setup
- [x] `teams/utils.ts` - fetchWithDeduplication, handleApiError
- [ ] `teams/actions/fetch-actions.ts` - fetchUserTeams, fetchSubteams, etc.
- [ ] `teams/actions/update-actions.ts` - updateRoster, updateMembers, etc.
- [ ] `teams/actions/optimistic-actions.ts` - addRosterEntry, removeMemberEvent, etc.
- [ ] `teams/index.ts` - Main store using Zustand

**Result:** ~6 files, largest <300 lines

---

### 2. src/lib/services/cockroachdb-teams.ts (669 lines)

**Strategy:** Split by operation type

**New Structure:**
```
src/lib/services/cockroachdb-teams/
├── types.ts (~50 lines) - Service type definitions
├── queries.ts (~250 lines) - Read operations
├── mutations.ts (~250 lines) - Write operations
└── index.ts (~100 lines) - Main service class
```

**Approach:**
- Extract all `getUserTeams`, `getTeamMembers` → queries.ts
- Extract all `createTeamGroup`, `updateTeamUnit` → mutations.ts
- Keep main service class that delegates to query/mutation modules

**Result:** ~4 files, largest <250 lines

---

### 3. src/app/teams/components/TeamDashboard.tsx (669 lines)

**Strategy:** Extract sub-components and hooks

**New Structure:**
```
src/app/teams/components/dashboard/
├── TeamDashboard.tsx (~150 lines) - Main layout
├── DashboardHeader.tsx (~100 lines) - Header section
├── DashboardStats.tsx (~100 lines) - Statistics cards
├── DashboardTabs.tsx (~150 lines) - Tab navigation
├── RecentActivity.tsx (~120 lines) - Activity feed
└── hooks/
    └── useDashboardData.ts (~100 lines) - Data fetching logic
```

**Result:** ~6 files, largest <150 lines

---

### 4. src/app/teams/components/TeamCalendar.tsx (864 lines)

**Strategy:** Split calendar into view components and logic hooks

**New Structure:**
```
src/app/teams/components/calendar/
├── TeamCalendar.tsx (~150 lines) - Main calendar container
├── CalendarView.tsx (~200 lines) - Calendar grid view
├── EventList.tsx (~120 lines) - Event list view
├── EventModal.tsx (~150 lines) - Event creation/edit modal
├── RecurringEventForm.tsx (~150 lines) - Recurring event form
└── hooks/
    ├── useCalendarData.ts (~100 lines) - Data fetching
    └── useCalendarEvents.ts (~100 lines) - Event management
```

**Result:** ~7 files, largest <200 lines

---

### 5. src/app/teams/components/Leaderboard.tsx (703 lines)

**Strategy:** Extract table components and filtering logic

**New Structure:**
```
src/app/teams/components/leaderboard/
├── Leaderboard.tsx (~120 lines) - Main container
├── LeaderboardTable.tsx (~200 lines) - Table display
├── LeaderboardFilters.tsx (~150 lines) - Filter controls
├── LeaderboardRow.tsx (~100 lines) - Table row component
├── StatsCard.tsx (~80 lines) - Individual stat card
└── hooks/
    └── useLeaderboardData.ts (~100 lines) - Data processing
```

**Result:** ~6 files, largest <200 lines

---

### 6. src/app/teams/components/AssignmentsTab.tsx (604 lines)

**Strategy:** Extract assignment components

**New Structure:**
```
src/app/teams/components/assignments/
├── AssignmentsTab.tsx (~120 lines) - Main tab
├── AssignmentList.tsx (~150 lines) - List view
├── AssignmentCard.tsx (~120 lines) - Individual assignment
├── AssignmentForm.tsx (~150 lines) - Create/edit form
└── hooks/
    └── useAssignments.ts (~100 lines) - Assignment operations
```

**Result:** ~5 files, largest <150 lines

---

## Summary Statistics

**Before:**
- 7 files over 600 lines
- Total: ~6,000 lines in large files
- Difficult to navigate and maintain

**After:**
- ~40 focused files
- Largest file: ~300 lines
- All files under 600 lines
- Clear separation of concerns

## Benefits

1. **Better Organization**
   - Related code grouped together
   - Clear file responsibilities

2. **Easier Maintenance**
   - Smaller files easier to understand
   - Changes isolated to specific areas

3. **Improved Reusability**
   - Components can be reused independently
   - Hooks can be shared across components

4. **Better Testing**
   - Test individual modules in isolation
   - Easier to mock dependencies

5. **Team Collaboration**
   - Reduced merge conflicts
   - Clear ownership boundaries

## Implementation Priority

1. ✅ **teams.ts router** - COMPLETED
2. 🔄 **teamStore.ts** - IN PROGRESS (types, client, utils created)
3. **cockroachdb-teams.ts** - High priority (backend service)
4. **TeamDashboard.tsx** - Medium priority (most used component)
5. **TeamCalendar.tsx** - Medium priority (complex component)
6. **Leaderboard.tsx** - Low priority (standalone feature)
7. **AssignmentsTab.tsx** - Low priority (already close to limit)

## Next Steps

1. Complete teamStore.ts refactoring by creating action files
2. Refactor cockroachdb-teams.ts service
3. Create component directories and extract sub-components
4. Update imports across codebase
5. Test all functionality
6. Document new structure

## Migration Notes

- All refactorings maintain backward compatibility
- Import paths updated but APIs unchanged
- Original files backed up with `.backup` extension
- Can be done incrementally without breaking changes

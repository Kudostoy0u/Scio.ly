# Team Store Modular Architecture

## Overview
The team store has been refactored from a single 1,228-line file into a modular structure with clear separation of concerns.

## Structure

```
src/lib/stores/teams/
├── types.ts (230 lines) - Type definitions
├── client.ts (25 lines) - tRPC client setup
├── utils.ts (35 lines) - Utility functions
├── actions/ (to be created)
│   ├── fetch-actions.ts - Data fetching operations
│   ├── update-actions.ts - Data update operations
│   └── optimistic-actions.ts - Optimistic UI updates
└── index.ts (to be created) - Main store export
```

## Files

### types.ts
Contains all TypeScript interfaces and types:
- `UserTeam`, `Subteam`, `TeamMember`, `RosterData`
- `StreamPost`, `StreamComment`, `Assignment`, `Tournament`, `Timer`
- `TeamStoreState` - Complete state shape
- `TeamStoreActions` - All available actions
- `CACHE_DURATIONS` - Cache configuration

### client.ts
tRPC client configuration:
- Configured with superjson transformer
- HTTP batch linking for performance
- Credential handling

### utils.ts
Shared utility functions:
- `fetchWithDeduplication` - Prevents duplicate requests
- `handleApiError` - Consistent error handling

### actions/ (To Be Created)

#### fetch-actions.ts
Data fetching operations:
- `fetchUserTeams`
- `fetchSubteams`
- `fetchRoster`
- `fetchMembers`
- `fetchStream`
- `fetchAssignments`
- `fetchTournaments`
- `fetchTimers`
- `fetchStreamData` (combined)

#### update-actions.ts
Data update operations:
- `updateRoster`
- `updateMembers`
- `updateSubteams`
- `updateAssignments`
- `addStreamPost`
- `addAssignment`
- `updateTimer`
- `addSubteam`
- `updateSubteam`
- `deleteSubteam`

#### optimistic-actions.ts
Optimistic UI updates:
- `addRosterEntry`
- `removeRosterEntry`
- `addMemberEvent`
- `removeMemberEvent`

### index.ts (To Be Created)
Main store export combining all actions and state using Zustand with:
- Initial state setup
- All actions from action modules
- Cache management functions
- Utility methods

## Usage

```typescript
import { useTeamStore } from '@/lib/stores/teams';

function MyComponent() {
  const { userTeams, fetchUserTeams, loading } = useTeamStore();

  useEffect(() => {
    fetchUserTeams(userId);
  }, [userId]);

  return <div>{/* ... */}</div>;
}
```

## Benefits

1. **Maintainability**: Each file has a single, clear responsibility
2. **Discoverability**: Easy to find specific functionality
3. **Testing**: Test individual modules in isolation
4. **Code Review**: Smaller files are easier to review
5. **Performance**: No change - same runtime behavior

## Migration

The original `teamStore.ts` can remain as a compatibility layer that re-exports from the new modular structure, ensuring no breaking changes for existing code.

## Next Steps

1. Create `actions/fetch-actions.ts` with all fetch operations
2. Create `actions/update-actions.ts` with all update operations
3. Create `actions/optimistic-actions.ts` with optimistic updates
4. Create `index.ts` to combine everything into the Zustand store
5. Update `teamStore.ts` to re-export from new structure
6. Test all functionality
7. Remove old `teamStore.ts` once migration is confirmed

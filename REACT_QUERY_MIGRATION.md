# React Query Migration Guide

## Overview

We're migrating from a custom cache-based system to **React Query** for managing team data. This provides:

- ✅ **Zero cache inconsistencies** - React Query handles all caching automatically
- ✅ **Simple, predictable API** - Just `useQuery` and `useMutation`
- ✅ **Automatic background refetching** - Data stays fresh
- ✅ **Optimistic updates** - Fast UI updates
- ✅ **Persistence** - Data persists across page reloads via IndexedDB
- ✅ **No manual cache invalidation** - React Query handles it

## Architecture

### Old System (Complex, Error-Prone)
```
Component → useTeamStore → Manual Cache → tRPC → Database
                 ↓
            Cache Invalidation Logic
            Timestamps, Keys, etc.
```

### New System (Simple, Reliable)
```
Component → useTeamQuery (React Query) → Server Actions → Database
                              ↓
                    Automatic Caching & Persistence
```

## New Files Created

### 1. Query Setup
- `src/lib/query/client.ts` - React Query client configuration
- `src/lib/query/persister.ts` - IndexedDB persistence layer

### 2. Data Layer
- `src/lib/actions/teams.ts` - Server actions (replaces tRPC endpoints)
- `src/lib/hooks/useTeamQuery.ts` - React Query hooks

### 3. Database (Optional - for offline support)
- `src/lib/db/dexie-teams.ts` - Dexie schema (mirrors backend)
- `src/lib/services/dexie-team-service.ts` - Query helpers

### 4. Components
- `src/app/teams/components/PeopleTabNew.tsx` - New People tab using React Query

## Migration Steps

### Step 1: Setup QueryClientProvider

Add to your root layout or app wrapper:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from '@/lib/query/client';
import { queryPersister } from '@/lib/query/persister';

function App({ children }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
```

### Step 2: Replace Components

#### Old Pattern (Complex)
```tsx
const { getMembers, loadMembers } = useTeamStore();

useEffect(() => {
  loadMembers(teamSlug, subteamId);
}, [teamSlug, subteamId]);

const members = getMembers(teamSlug, subteamId);
```

#### New Pattern (Simple)
```tsx
const { data, isLoading } = useTeamMembers(teamSlug, subteamId);
const members = data?.members || [];
```

### Step 3: Update Mutations

#### Old Pattern
```tsx
await someAction();
invalidateCache(`members-${teamSlug}-${subteamId}`);
```

#### New Pattern
```tsx
const { invalidateMembers } = useInvalidateTeam();

await someAction();
invalidateMembers(teamSlug, subteamId);
```

## API Reference

### Hooks

```tsx
// Get team page data
const { data, isLoading, error } = useTeamPage(teamSlug);

// Get members
const { data, isLoading } = useTeamMembers(teamSlug, subteamId);

// Get roster
const { data, isLoading } = useTeamRoster(teamSlug, subteamId);

// Get assignments
const { data, isLoading } = useTeamAssignments(teamSlug);

// Invalidate data
const { invalidateMembers, invalidateRoster, invalidateAll } = useInvalidateTeam();
```

### Server Actions

```tsx
// In server actions/mutations
import { getTeamMembers, getTeamRoster } from '@/lib/actions/teams';

const members = await getTeamMembers(teamSlug, subteamId);
const roster = await getTeamRoster(teamSlug, subteamId);
```

## Benefits

### 1. No More Cache Bugs
- React Query automatically manages cache
- No manual timestamps or keys
- No "stale data" issues

### 2. Simpler Code
- Components are 50% smaller
- No useEffect for data loading
- No manual cache invalidation logic

### 3. Better UX
- Automatic loading states
- Background refetching
- Optimistic updates
- Offline support

### 4. Performance
- Intelligent caching
- Request deduplication
- Parallel queries
- Persistent cache

## Rollout Plan

1. ✅ Create new infrastructure
2. ✅ Build new PeopleTab
3. 🔄 Build new RosterTab
4. ⏳ Update TeamDataLoader
5. ⏳ Wire up QueryClientProvider
6. ⏳ Test thoroughly
7. ⏳ Swap old components for new
8. ⏳ Remove old cache system

## Testing Checklist

- [ ] Page loads show cached data instantly
- [ ] Data updates after mutations
- [ ] Switching tabs doesn't lose data
- [ ] Offline mode works
- [ ] Multiple tabs stay in sync
- [ ] No memory leaks
- [ ] DevTools show correct queries

## Next Steps

1. Complete RosterTab migration
2. Update TeamDataLoader to prefetch queries
3. Add React Query DevTools for debugging
4. Remove old useTeamStore entirely
5. Clean up unused tRPC endpoints

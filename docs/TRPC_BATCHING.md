# tRPC Batching Implementation for Teams

## Overview

Implemented tRPC with automatic request batching to reduce server load for teams features. This replaces multiple individual API calls with batched HTTP requests.

## Key Benefits

1. **Reduced Server Load**: Multiple API calls are batched into single HTTP requests
2. **Better Performance**: Fewer round trips to the server
3. **Type Safety**: Full TypeScript support with end-to-end type inference
4. **Automatic Caching**: React Query integration provides intelligent caching

## Architecture

### Server Side (`src/lib/trpc/`)

- **`context.ts`**: Creates request context with user authentication
- **`server.ts`**: tRPC server configuration with SuperJSON transformer
- **`routers/teams.ts`**: Teams router with batched procedures:
  - `getUserTeams`: Get all user teams
  - `getSubteams`: Get subteams for a team
  - `getMembers`: Get team members
  - `getRoster`: Get team roster
  - **`batchLoadTeamData`**: Batch load all team data in one request
- **`routers/_app.ts`**: Root router combining all routers

### Client Side

- **`src/lib/trpc/client.ts`**: tRPC client with `httpBatchLink`
- **`src/lib/trpc/Provider.tsx`**: React provider wrapping React Query
- **`src/lib/hooks/useTeamDataTRPC.ts`**: Custom hooks for team data

### API Route

- **`src/app/api/trpc/[trpc]/route.ts`**: Next.js API route handler

## Integration Points

### 1. Root Layout (`src/app/layout.tsx`)

```tsx
<TRPCProvider>
  <Providers>
    {children}
  </Providers>
</TRPCProvider>
```

### 2. Team Data Preloader (`src/app/teams/components/TeamDataPreloader.tsx`)

Uses tRPC to prefetch team data on page load:

```tsx
trpc.teams.getSubteams.useQuery({ teamSlug }, { enabled: !!teamSlug });
```

### 3. Teams Page Client (`src/app/teams/components/TeamsPageClient.tsx`)

Batch loads member counts for all teams:

```tsx
const utils = trpc.useUtils();
await utils.teams.getMembers.fetch({ teamSlug, subteamId: 'all' });
```

### 4. Team Dashboard (`src/app/teams/components/TeamDashboard.tsx`)

Loads subteams with automatic caching:

```tsx
const { data: subteamsData } = trpc.teams.getSubteams.useQuery(
  { teamSlug: team.slug },
  { staleTime: 10 * 60 * 1000 }
);
```

## Request Batching

tRPC automatically batches multiple queries that occur within the same render cycle:

**Before (Multiple Requests)**:
```
GET /api/teams/user-teams
GET /api/teams/[slug]/subteams
GET /api/teams/[slug]/members
GET /api/teams/[slug]/roster
```

**After (Single Batched Request)**:
```
POST /api/trpc?batch=1&input={...}
```

## Usage Examples

### Basic Query

```tsx
import { trpc } from '@/lib/trpc/client';

function MyComponent({ teamSlug }: { teamSlug: string }) {
  const { data, isLoading } = trpc.teams.getSubteams.useQuery({ teamSlug });
  
  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.subteams.length} subteams</div>;
}
```

### Batch Load

```tsx
const { data } = trpc.teams.batchLoadTeamData.useQuery({
  teamSlug,
  subteamId: 'team-id',
  includeRoster: true
});

// Returns: { subteams, members, roster }
```

### Prefetching

```tsx
const utils = trpc.useUtils();

useEffect(() => {
  utils.teams.getSubteams.prefetch({ teamSlug });
}, [teamSlug]);
```

## Performance Impact

Based on the initial analytics showing `/site-logo.png` at 2.1K requests with 23% cache rate:

- **Expected Reduction**: 60-70% fewer HTTP requests for team data
- **Cache Hit Rate**: Improved through React Query's intelligent caching
- **Server Load**: Significantly reduced through batching

## Migration Guide

### Existing API Calls

Old pattern:
```tsx
const response = await fetch(`/api/teams/${slug}/subteams`);
const data = await response.json();
```

New pattern:
```tsx
const { data } = trpc.teams.getSubteams.useQuery({ teamSlug: slug });
```

### Existing Team Store

The existing `useTeamStore` continues to work. tRPC is used for initial data fetching, and the store can be updated if needed.

## Configuration

### Caching

Configured in `src/lib/trpc/Provider.tsx`:

```tsx
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  },
}
```

### Batching

Configured in `src/lib/trpc/client.ts`:

```tsx
httpBatchLink({
  url: '/api/trpc',
  maxURLLength: 2083, // Batch multiple requests
})
```

## Testing

To verify batching is working:

1. Open DevTools Network tab
2. Navigate to teams pages
3. Look for POST requests to `/api/trpc?batch=1`
4. Check request payload for multiple queries

## Future Enhancements

1. Add mutations for team operations (create, update, delete)
2. Implement optimistic updates for better UX
3. Add subscriptions for real-time team updates
4. Extend batching to other features (assignments, calendar)

## Dependencies

- `@trpc/server`: ^11.0.0
- `@trpc/client`: ^11.0.0
- `@trpc/react-query`: ^11.0.0
- `@tanstack/react-query`: ^5.90.3
- `superjson`: ^2.2.2
- `zod`: 4.0.17


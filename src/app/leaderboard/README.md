# Leaderboard Directory

This directory contains the leaderboard system for the Scio.ly platform. Provides ranking systems and performance tracking for Science Olympiad practice and competition.

## Files

### `page.tsx`
Server component wrapper that renders the leaderboard client page.

**Example:**
```1:5:src/app/leaderboard/page.tsx
import LeaderboardClientPage from "./leaderboardClientPage";

export default function LeaderboardPage() {
  return <LeaderboardClientPage />;
}
```

### `leaderboardClientPage.tsx`
Client-side leaderboard page component.

**Key Features:**
- Displays team and individual leaderboards
- Ranking visualization
- Performance metrics
- Filtering and sorting

**Important Notes:**
- Client component for interactive leaderboard
- Integrates with leaderboard API
- Theme-aware design

### `[code]/page.tsx`
Dynamic route for code-specific leaderboards.

**Features:**
- Leaderboard by share code
- Team-specific rankings
- Performance tracking

## Components

### `components/`
Leaderboard-specific components for displaying rankings and metrics.

## Hooks

### `hooks/`
Custom hooks for leaderboard data management.

## Handlers

### `handlers/`
Leaderboard action handlers.

## Types

### `types.ts`
TypeScript type definitions for leaderboard data structures.

## Important Notes

1. **Dynamic Routes**: Supports code-based leaderboard access
2. **Team Rankings**: Team and individual leaderboard support
3. **Performance Tracking**: Real-time performance metrics
4. **Theme Support**: Dark/light mode support

# Analytics Directory

This directory contains the analytics and data visualization system for the Scio.ly platform. Provides comprehensive user performance analytics, ELO rating tracking, and data visualization tools.

## Files

### `page.tsx`
Server component that renders the analytics page.

**Example:**
```typescript
import AnalyticsContent from "./AnalyticsContent";

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
```

### `AnalyticsContent.tsx`
Main analytics dashboard component.

**Key Features:**
- ELO rating visualization
- Performance trend analysis
- User statistics display
- Interactive charts and graphs

## Components

### `components/EloViewer.tsx`
ELO rating visualization component.

**Features:**
- ELO rating display
- Rating history charts
- Performance trends
- Rating calculations

**Subcomponents:**
- `ChartControls.tsx` - Chart control interface
- `ChartsTab.tsx` - Charts tab display
- `EventSelector.tsx` - Event selection
- `SchoolSelector.tsx` - School selection

### `components/CompareTool.tsx`
Performance comparison tool.

**Features:**
- Multi-user comparison
- Performance metrics comparison
- Statistical analysis
- Comparison visualization

**Subcomponents:**
- `MobileComparisonView.tsx` - Mobile comparison view
- `OverallResult.tsx` - Overall comparison results
- `SchoolInput.tsx` - School input component
- `useSchoolSuggestions.ts` - School suggestion hook

### `components/ChartRangeSlider.tsx`
Date range selection component.

**Features:**
- Date range picker interface
- Range validation
- Custom date selection
- Range change callbacks

### `components/chart/`
Chart configuration files.

**Files:**
- `chartConstants.ts` - Chart constants
- `chartUtils.ts` - Chart utilities
- `eventSeasonConfig.ts` - Event season chart config
- `eventTournamentConfig.ts` - Event tournament chart config
- `overallSeasonConfig.ts` - Overall season chart config
- `overallTournamentConfig.ts` - Overall tournament chart config

### `components/DivisionSelector.tsx`
Division selection component.

**Features:**
- Division B/C selection
- Division filtering

### `components/EmptyState.tsx`
Empty state component for analytics.

**Features:**
- Empty state display
- User guidance

### `components/ErrorState.tsx`
Error state component.

**Features:**
- Error display
- Error recovery options

### `components/LoadingState.tsx`
Loading state component.

**Features:**
- Loading indicators
- Progress display

### `components/BackgroundLoadingIndicator.tsx`
Background loading indicator.

**Features:**
- Background loading state
- Non-blocking loading indicator

## Hooks

### `hooks/useLazyEloData.ts`
Lazy ELO data management hook.

**Features:**
- Lazy ELO data fetching
- Data processing and transformation
- Performance optimization
- Error handling

## Types

### `types/elo.ts`
ELO rating type definitions.

**Features:**
- ELO rating interfaces
- Performance metrics types
- Data structure definitions

## Utils

### `utils/dataLoader.ts`
Analytics data loading utilities.

**Features:**
- Data fetching functions
- Data transformation
- Caching strategies
- Error handling

### `utils/eloDataProcessor.ts`
ELO data processing utilities.

**Features:**
- ELO data processing
- Data aggregation
- Performance calculations

### `utils/eloDataProcessor/`
ELO data processor modules.

**Files:**
- `index.ts` - Main processor export
- `processors/comparisonProcessor.ts` - Comparison processing
- `processors/eventProcessor.ts` - Event data processing
- `processors/leaderboardProcessor.ts` - Leaderboard processing
- `processors/overallProcessor.ts` - Overall data processing
- `utils/dateUtils.ts` - Date utility functions
- `utils/schoolHelpers.ts` - School helper functions

## Tests

### `__tests__/eloDataProcessor.test.ts`
ELO data processor tests.

**Features:**
- Unit tests for data processing
- Data transformation tests
- Performance tests

## Important Notes

1. **ELO Rating System**: Comprehensive ELO rating tracking and visualization
2. **Performance Analytics**: Detailed performance metrics and trends
3. **Data Visualization**: Interactive charts and graphs
4. **Comparison Tools**: Multi-user/school comparison functionality
5. **Lazy Loading**: Optimized data loading with lazy loading
6. **Date Range Selection**: Customizable date ranges for analytics
7. **Division Support**: Division B and C analytics
8. **Theme Support**: Dark/light mode support

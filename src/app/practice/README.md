# Practice Directory

This directory contains the practice mode system for the Scio.ly platform. Provides comprehensive practice functionality, question management, and progress tracking for Science Olympiad preparation.

## Files

### `page.tsx`
Server component that renders the practice page.

**Example:**
```1:14:src/app/practice/page.tsx
import Content from "@/app/practice/practiceDashboard";
import type { Metadata } from "next";

export const dynamic = "force-static";
export const revalidate = false;

export const metadata: Metadata = {
  title: "Scio.ly | Practice",
  description: "Practice your skills with tens of thousands of real Science Olympiad questions",
};
export default function Page() {
  return <Content />;
}
```

**Important Notes:**
- Uses static generation for performance
- Sets SEO metadata for practice page

### `practiceDashboard.tsx`
Simple wrapper that exports the PracticeDashboard component.

**Example:**
```1:3:src/app/practice/practiceDashboard.tsx
import PracticeDashboard from "./components/PracticeDashboard";

export default PracticeDashboard;
```

### `types.ts`
TypeScript type definitions for practice components.

**Key Types:**
- Practice settings interfaces
- Event selection types
- Configuration types

### `utils.ts`
Practice utility functions.

**Features:**
- Practice configuration utilities
- Settings management

## Components

### `components/PracticeDashboard.tsx`
Main practice dashboard component. Provides the practice mode interface with event selection and configuration.

**Key Features:**
- Event selection interface
- Test configuration options
- Difficulty selection
- Division toggle (B/C)
- Subtopic filtering
- Quote length selection (for Codebusters)
- ID percentage slider
- Favorite events
- Quick start buttons

**Important Notes:**
- Main entry point for practice mode
- Integrates with practice hooks
- Theme-aware design
- Responsive layout

### `components/TestConfiguration.tsx`
Test configuration component for setting up practice tests.

**Key Features:**
- Question count selection
- Time limit configuration
- Question type selection (MCQ/FRQ)
- Difficulty selection
- Division selection
- Subtopic filtering
- ID percentage configuration

**Important Notes:**
- Comprehensive test configuration
- Validates settings
- Persists preferences

### `components/EventList.tsx`
Science Olympiad event list component.

**Key Features:**
- Displays all available events
- Event filtering
- Event search
- Favorite event indicators
- Event selection

**Important Notes:**
- Shows Division B and C events
- Supports event filtering
- Integrates with favorites

### `components/DifficultyDropdown.tsx`
Difficulty level selection dropdown.

**Features:**
- Difficulty level options (very easy, easy, medium, hard, very hard)
- Multiple difficulty selection
- Visual difficulty indicators

### `components/DivisionToggle.tsx`
Division selection toggle (B/C).

**Features:**
- Toggle between Division B and C
- Division-specific event filtering
- Visual division indicators

### `components/SubtopicDropdown.tsx`
Subtopic selection dropdown.

**Features:**
- Event-specific subtopics
- Multiple subtopic selection
- Subtopic filtering

### `components/QuoteLengthSlider.tsx`
Quote length slider for Codebusters practice.

**Features:**
- Adjustable quote length
- Visual slider interface
- Length validation

### `components/FavoriteHeart.tsx`
Favorite event toggle component.

**Features:**
- Toggle favorite status
- Heart animation
- Persists favorites

### `components/TestActions.tsx`
Test action buttons component.

**Features:**
- Start test button
- Start practice button
- Navigation actions

## Hooks

### `components/hooks/usePracticeSettings.ts`
Practice settings management hook.

**Features:**
- Settings state management
- Settings persistence
- Settings validation

### `components/hooks/useEventLoader.ts`
Event loading hook.

**Features:**
- Load events from API
- Event filtering
- Event data management

### `components/hooks/useClickOutside.ts`
Click outside detection hook.

**Features:**
- Detect clicks outside element
- Close dropdowns/modals

### `components/hooks/useMediaQuery.ts`
Media query hook for responsive design.

**Features:**
- Responsive breakpoints
- Screen size detection

### `components/hooks/useOfflineDownloads.ts`
Offline download management hook.

**Features:**
- Download questions for offline
- Offline state management

### `components/hooks/usePanelHeight.ts`
Panel height management hook.

**Features:**
- Dynamic panel heights
- Responsive height calculation

## Utils

### `components/utils/eventSelection.ts`
Event selection utilities.

**Features:**
- Event selection logic
- Event validation

### `components/utils/settingsHandlers.ts`
Settings handler utilities.

**Features:**
- Settings update handlers
- Settings validation

### `components/utils/settingsPersistence.ts`
Settings persistence utilities.

**Features:**
- Save settings to localStorage
- Load settings from localStorage

### `components/utils/displayTextUtils.ts`
Display text utilities.

**Features:**
- Format display text
- Text formatting helpers

### `components/utils/idPercentageSlider.ts`
ID percentage slider utilities.

**Features:**
- ID percentage calculation
- Slider value handling

### `components/utils/continueBanner.ts`
Continue practice banner utilities.

**Features:**
- Continue practice detection
- Banner display logic

### `components/utils/navigate.ts`
Navigation utilities.

**Features:**
- Test navigation
- Route building

### `components/styles/sliderStyles.tsx`
Slider styling components.

**Features:**
- Custom slider styles
- Theme-aware styling

## Important Notes

1. **Settings Persistence**: Practice settings are saved to localStorage
2. **Event Filtering**: Supports filtering by division, difficulty, subtopic
3. **Favorites**: Users can favorite events for quick access
4. **Codebusters Support**: Special configuration for Codebusters (quote length)
5. **ID Questions**: Supports ID percentage configuration for identification questions
6. **Responsive Design**: Mobile and desktop optimized
7. **Theme Support**: Dark/light mode support throughout
8. **Offline Support**: Can download questions for offline practice

# Test Page Modularization

This directory contains the modularized test page components, breaking down the original 1,200+ line `Content.tsx` into smaller, focused components.

## Structure

### Components (`/components/`)
- **TestLayout.tsx** - Overall page layout and styling
- **TestHeader.tsx** - Header with title, timer, and reset button
- **ProgressBar.tsx** - Progress indicator showing test completion
- **QuestionCard.tsx** - Individual question display and interaction
- **TestFooter.tsx** - Submit/reset buttons and navigation
- **index.ts** - Barrel export for clean imports

### Hooks (`/hooks/`)
- **useTestState.ts** - Custom hook containing all test state management logic

### Main Files
- **Content.tsx** - Main component that orchestrates all the modular pieces
- **page.tsx** - Next.js page wrapper

## Benefits of Modularization

1. **Maintainability** - Each component has a single responsibility
2. **Reusability** - Components can be reused in other parts of the app
3. **Testability** - Smaller components are easier to unit test
4. **Readability** - Code is more organized and easier to understand
5. **Performance** - Better code splitting and lazy loading opportunities

## Component Responsibilities

- **TestLayout**: Handles overall page structure, background, and scrollbar styling
- **TestHeader**: Manages title display, timer, and reset functionality
- **ProgressBar**: Shows test completion progress
- **QuestionCard**: Handles individual question rendering, answer selection, and grading display
- **TestFooter**: Contains submit/reset buttons and navigation
- **useTestState**: Centralizes all state management, API calls, and business logic

## State Management

All complex state management has been moved to the `useTestState` custom hook, which provides:
- Test data loading and caching
- User answer management
- Timer functionality
- Grading and scoring
- Bookmark management
- Explanation handling
- Modal state management

This approach follows React best practices by separating concerns and making the code more maintainable.

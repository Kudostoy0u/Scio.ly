# Test Directory

This directory contains the comprehensive test-taking system for the Scio.ly platform. Provides full-featured testing functionality, question management, progress tracking, and assessment tools for Science Olympiad practice.

## Files

### `page.tsx`
Server component that handles test page routing and parameter extraction.

**Key Features:**
- Extracts test parameters from cookies and URL search params
- Supports assignment mode (`assignmentId`, `viewResults`)
- Supports team assignments (`teamsAssign`)
- Parses test configuration (event, question count, time limit, etc.)
- Passes parameters to client component

**Example:**
```13:84:src/app/test/page.tsx
export default async function Page({
  searchParams,
}: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("scio_test_params")?.value;
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
  } catch {
    // ignore malformed cookie
  }

  // Check for assignment parameter in URL
  const resolvedSearchParams = await searchParams;
  const assignmentId = resolvedSearchParams.assignmentId as string | undefined;
  const viewResults = resolvedSearchParams.viewResults as string | undefined;

  // Extract query parameters from URL
  const teamsAssign = resolvedSearchParams.teamsAssign as string | undefined;

  const eventName = parsed?.eventName as string | undefined;
  const questionCount = parsed?.questionCount?.toString() as string | undefined;
  const timeLimit = parsed?.timeLimit?.toString() as string | undefined;
  // ... more parameter extraction

  return <Content initialData={initialData} initialRouterData={finalRouterData} />;
}
```

**Important Notes:**
- Uses `force-dynamic` for dynamic rendering
- Reads test parameters from cookies (`scio_test_params`)
- Supports assignment and team assignment modes
- Does not SSR-fetch questions (client handles loading)

### `content.tsx`
Main client component that orchestrates the test interface.

**Key Features:**
- Test state management via `useTestState` hook
- Question display and navigation
- Answer submission and grading
- Timer management
- Print functionality
- Share functionality
- Edit question functionality
- Bookmark functionality

**Important Notes:**
- Client component that manages entire test session
- Integrates with multiple hooks for state management
- Handles test submission and results display

## Components

### `components/TestLayout.tsx`
Main layout component that structures the test interface.

**Features:**
- Header with test info and timer
- Question display area
- Footer with navigation and actions
- Responsive layout

### `components/TestHeader.tsx`
Test header component displaying test information and timer.

**Features:**
- Event name display
- Timer countdown
- Progress indicator
- Test controls

### `components/TestFooter.tsx`
Test footer component with navigation and action buttons.

**Features:**
- Previous/Next question navigation
- Submit test button
- Progress indicators
- Quick navigation

### `components/QuestionCard.tsx`
Individual question display component.

**Features:**
- Question text rendering
- Multiple choice options
- Free response input
- Image display for ID questions
- Answer input handling

### `components/ProgressBar.tsx`
Progress visualization component.

**Features:**
- Visual progress bar
- Questions answered indicator
- Completion percentage

### `components/TestSummary.tsx`
Test results summary component.

**Features:**
- Score display
- Accuracy percentage
- Question-by-question results
- Explanation links

### `components/TestActionButtons.tsx`
Action buttons for test operations.

**Features:**
- Share test button
- Print test button
- Edit question button
- Bookmark button

### `components/TestContentWrapper.tsx`
Wrapper component for test content area.

**Features:**
- Content layout management
- Responsive design
- Theme support

### `components/TestPrintConfigModal.tsx`
Print configuration modal for test printing.

**Features:**
- Print settings
- Layout options
- Format configuration

### `components/PreviewAssignmentSection.tsx`
Preview section for team assignments.

**Features:**
- Assignment preview
- Assignment details
- View results option

### `components/TestCodebustersMessage.tsx`
Special message component for Codebusters tests.

**Features:**
- Codebusters-specific instructions
- Cipher information

### `components/TestMainContent.tsx`
Main content area component.

**Features:**
- Question display
- Answer input
- Navigation

## Hooks

### `hooks/useTestState.ts`
Main test state management hook. Manages all test session state including questions, answers, timing, and grading.

**Key Features:**
- Question loading and management
- Answer state management
- Timer integration
- Grading state
- Submission handling
- Assignment loading
- Preview mode support

**Example:**
```65:80:src/app/test/hooks/useTestState.ts
export function useTestState({
  initialData,
  initialRouterData,
}: { initialData?: unknown[]; initialRouterData?: Record<string, unknown> } = {}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const fetchStartedRef = useRef(false);
  const fetchCompletedRef = useRef(false);
  const [data, setData] = useState<Question[]>(
    Array.isArray(initialData) ? (initialData as Question[]) : []
  );

  // Debug data state changes
  useEffect(() => {
    if (data.length > 0) {
      // Debug logging can go here if needed
    }
  }, [data]);
```

**Returns:**
- `data: Question[]` - Array of test questions
- `userAnswers: Record<number, unknown>` - User's answers
- `isSubmitted: boolean` - Submission state
- `isLoading: boolean` - Loading state
- `submitTest: () => void` - Submit function
- `updateAnswer: (index, answer) => void` - Update answer function
- And many more state and control functions

### `hooks/useTestAnswers.ts`
Answer management hook for test questions.

**Features:**
- Answer state management
- Answer validation
- Answer updates

### `hooks/useTestTimer.ts`
Timer management hook for timed tests.

**Features:**
- Countdown timer
- Time remaining calculation
- Timer pause/resume
- Time expiration handling

### `hooks/useTestGrading.ts`
Grading hook for test results.

**Features:**
- MCQ grading
- FRQ grading with AI
- Score calculation
- Results processing

### `hooks/useTestBookmarks.ts`
Bookmark management hook for test questions.

**Features:**
- Bookmark questions
- Unbookmark questions
- Bookmark state management

### `hooks/useTestEdit.ts`
Question editing hook for test questions.

**Features:**
- Edit question functionality
- Submit edits
- Edit state management

### `hooks/useTestSubmission.ts`
Test submission hook.

**Features:**
- Submit test
- Process results
- Save to database

### `hooks/useTestDataLoading.ts`
Data loading hook for test questions.

**Features:**
- Load questions from API
- Handle loading states
- Error handling

### `hooks/usePreviewToasts.ts`
Preview mode toast notifications hook.

**Features:**
- Preview mode notifications
- Toast management

## Services

### `services/questionLoader.ts`
Question loading service for fetching test questions.

**Features:**
- Fetch questions from API
- Handle question normalization
- Support for different question types
- Assignment question loading

## Utils

### `utils/assignmentLoader.ts`
Assignment loading utilities.

**Features:**
- Load assignment data
- Load view results data
- Assignment question fetching

### `utils/questionHandlers.ts`
Question action handlers.

**Features:**
- Edit question submission
- Remove question handling
- Question state updates

### `utils/testSubmission.ts`
Test submission utilities.

**Features:**
- Submit test to API
- Process submission results
- Save test results

### `utils/questionMedia.ts`
Question media handling utilities.

**Features:**
- Image loading
- Media display
- ID question handling

### `utils/normalize.ts`
Question normalization utilities.

**Features:**
- Normalize question data
- Format question text
- Handle question variations

### `utils/fetchQuestions.ts`
Question fetching utilities.

**Features:**
- Fetch questions from API
- Handle query parameters
- Support filtering

### `utils/initLoad.ts`
Initial load utilities.

**Features:**
- Initial question loading
- Parameter resolution
- State initialization

### `utils/ssr.ts`
SSR parameter resolution utilities.

**Features:**
- Resolve router parameters
- Parameter normalization

### `utils/preview.ts`
Preview mode utilities.

**Features:**
- Preview mode handling
- Autofill functionality

### `utils/storageRestore.ts`
Storage restoration utilities.

**Features:**
- Restore test state from storage
- Resume test sessions

### `utils/timeHooks.ts`
Time management hooks utilities.

**Features:**
- Countdown hook
- Pause on unmount
- Resume on mount
- Visibility handling

### `utils/print/`
Print utilities directory.

**Files:**
- `content.ts` - Print content generation
- `setupWindow.ts` - Print window setup
- `styles.ts` - Print styles

**Features:**
- Generate print-ready HTML
- Setup print window
- Apply print styles

### `utils/printUtils.ts`
Print utility functions.

**Features:**
- Print test functionality
- Print configuration

## Important Notes

1. **State Management**: Uses multiple hooks for comprehensive state management
2. **Timer Support**: Full timer support with pause/resume functionality
3. **Assignment Mode**: Supports team assignments and preview mode
4. **Question Types**: Supports MCQ, FRQ, and ID questions
5. **Grading**: AI-powered grading for FRQ questions
6. **Storage**: Test state persisted in localStorage for resume capability
7. **Print Support**: Full print functionality for tests
8. **Share Support**: Share test codes for collaboration
9. **Bookmark Support**: Bookmark questions during test
10. **Edit Support**: Edit questions during test (submitted to admin)

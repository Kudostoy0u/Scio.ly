# Utils Directory

This directory contains utility functions and helpers specific to the Scio.ly application. These utilities provide common functionality for bookmarks, database operations, AI services, leaderboards, metrics, questions, sharing, storage, testing, and more.

## Files

### `bookmarks.ts`
Bookmark management utilities for Science Olympiad questions. Provides CRUD operations for user bookmarks with Supabase integration.

**Key Functions:**
- `loadBookmarksFromSupabase(userId: string)` - Loads all bookmarks for a user from Supabase
- `addBookmark(userId, question, eventName, source)` - Adds a bookmark to Supabase
- `removeBookmark(userId, question, source)` - Removes a bookmark from Supabase

**Example:**
```53:89:src/app/utils/bookmarks.ts
/**
 * Loads user bookmarks from Supabase database
 * Retrieves all bookmarks for a specific user, ordered by creation date
 *
 * @param {string} userId - The user ID to load bookmarks for
 * @returns {Promise<BookmarkedQuestion[]>} Array of bookmarked questions
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const bookmarks = await loadBookmarksFromSupabase('user-123');
 * console.log(bookmarks); // [{ question: {...}, eventName: 'Anatomy & Physiology', ... }]
 * ```
 */
export const loadBookmarksFromSupabase = async (userId: string): Promise<BookmarkedQuestion[]> => {
  // Implementation
};
```

**Important Notes:**
- Uses Supabase for bookmark storage
- Includes Firebase compatibility alias (`loadBookmarksFromFirebase`)
- Bookmarks are stored with question data, event name, source, and timestamp

### `db.ts`
Offline database utilities using IndexedDB (Dexie) for offline question access.

**Key Features:**
- `ScioDatabase` class extending Dexie
- `QuestionEntry` interface for cached questions
- Stores questions by event slug with timestamps

**Example:**
```14:46:src/app/utils/db.ts
export interface QuestionEntry {
  /** URL-friendly event identifier */
  eventSlug: string;
  /** Array of cached questions */
  questions: unknown[];
  /** Timestamp when questions were last updated */
  updatedAt: number;
}

export class ScioDatabase extends Dexie {
  /** Questions table for offline storage */
  questions!: Table<QuestionEntry, string>;

  constructor() {
    super("scio-offline");
    this.version(1).stores({
      questions: "&eventSlug, updatedAt",
    });
  }
}

export const db = new ScioDatabase();
```

**Important Notes:**
- Uses Dexie (IndexedDB wrapper) for offline storage
- Database name: "scio-offline"
- Questions cached by event slug for offline access

### `questionUtils.ts`
Question processing utilities including grading, filtering, explanation fetching, and difficulty management.

**Key Functions:**
- `gradeFreeResponses(questions, userAnswers)` - Grades free response questions using AI
- `gradeWithGemini(question, userAnswer)` - Grades a single question with Gemini AI
- `getExplanation(question, eventName)` - Fetches AI-generated explanation for a question
- `calculateMCQScore(question, userAnswers)` - Calculates score for multiple choice questions
- `filterQuestionsByType(questions, types)` - Filters questions by type (MCQ/FRQ)
- `difficultyRanges` - Maps difficulty names to numerical ranges

**Example:**
```75:95:src/app/utils/questionUtils.ts
export const difficultyRanges: Record<string, { min: number; max: number }> = {
  "very-easy": { min: 0, max: 0.19 },
  easy: { min: 0.2, max: 0.39 },
  medium: { min: 0.4, max: 0.59 },
  hard: { min: 0.6, max: 0.79 },
  "very-hard": { min: 0.8, max: 1.0 },
};

export const isMultiSelectQuestion = (question: string, answers?: (number | string)[]): boolean => {
  // Implementation
};
```

**Important Notes:**
- Integrates with Gemini AI for grading and explanations
- Supports both MCQ and FRQ question types
- Difficulty ranges from 0.0 (very easy) to 1.0 (very hard)

### `geminiService.ts`
Gemini AI service utilities for question analysis and improvement suggestions.

**Key Features:**
- `GeminiService` class with methods:
  - `suggestQuestionEdit(question, userReason?)` - Suggests question improvements
  - `analyzeReport(question, reportReason)` - Analyzes reported questions
- Interfaces: `Question`, `EditSuggestion`, `ReportAnalysis`

**Example:**
```73:95:src/app/utils/geminiService.ts
class GeminiService {
  async suggestQuestionEdit(question: Question, userReason?: string): Promise<EditSuggestion> {
    try {
      const requestBody: {
        question: Question;
        userReason?: string;
      } = {
        question,
        userReason,
      };
      // API call to Gemini endpoint
    }
  }
}

export const geminiService = new GeminiService();
```

**Important Notes:**
- Uses `/api/gemini` endpoints for AI operations
- Provides structured suggestions and analysis
- Handles error cases gracefully

### `shareCodeUtils.ts`
Share code utilities for generating and loading shared test codes.

**Key Functions:**
- `loadSharedTestCode(code: string)` - Loads a shared test by code
- `handleShareCodeRedirect(code: string)` - Handles redirect to shared test

**Example:**
```67:100:src/app/utils/shareCodeUtils.ts
export const loadSharedTestCode = async (code: string): Promise<ShareCodeResult> => {
  try {
    const response = await fetch(api.share.generate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    // Process response
  }
};
```

**Important Notes:**
- Generates shareable test codes
- Supports Codebusters quote sharing
- Integrates with `/api/share` endpoints

### `dashboardData.ts`
Dashboard data management utilities for user performance metrics and statistics.

**Key Functions:**
- `syncDashboardData(userId)` - Syncs dashboard data from server
- `getInitialDashboardData()` - Gets initial dashboard state
- `updateDashboardMetrics(userId, metrics)` - Updates user metrics

**Interfaces:**
- `HistoryRecord` - Individual test/activity record
- `DashboardData` - Complete dashboard data structure

**Important Notes:**
- Manages local storage for dashboard state
- Syncs with server for persistence
- Tracks test history, accuracy, questions answered, etc.

### `metrics.ts`
Metrics calculation utilities for daily, weekly, and monthly statistics.

**Key Functions:**
- `getDailyMetrics(userId)` - Gets daily performance metrics
- `getWeeklyMetrics(userId)` - Gets weekly performance metrics
- `getMonthlyMetrics(userId)` - Gets monthly performance metrics
- `updateMetrics(userId, metrics)` - Updates user metrics

**Important Notes:**
- Calculates accuracy, questions answered, time spent
- Aggregates data by time period
- Stores metrics in Supabase

### `timeManagement.ts`
Test session time management utilities for timed tests.

**Key Functions:**
- `initializeTestSession(eventName, timeLimit)` - Starts a new test session
- `saveTestSession(session)` - Saves session to localStorage
- `clearTestSession()` - Clears current session
- `resumeTestSession()` - Resumes paused session
- `pauseTestSession()` - Pauses current session
- `updateTimeLeft(newTimeLeft)` - Updates remaining time
- `isTestExpired()` - Checks if test time has expired
- `formatTime(seconds)` - Formats seconds as MM:SS

**Example:**
```116:163:src/app/utils/timeManagement.ts
export const initializeTestSession = (
  eventName: string,
  timeLimit: number,
  questionCount?: number
): TestSession => {
  const session: TestSession = {
    eventName,
    timeLimit,
    startTime: Date.now(),
    pausedAt: null,
    timeLeft: timeLimit,
    questionCount,
    submitted: false,
  };
  saveTestSession(session);
  return session;
};
```

**Important Notes:**
- Manages test timing state in localStorage
- Handles pause/resume functionality
- Tracks test expiration
- Supports visibility change handling (tab switching)

### `storage.ts`
Local storage utilities for event name slugification and download tracking.

**Key Functions:**
- `slugifyEventName(name: string)` - Converts event name to URL-friendly slug
- `subscribeToDownloads(onUpdate)` - Subscribes to download updates

**Important Notes:**
- Handles event name normalization
- Manages download state tracking

### `favorites.ts`
Favorite configuration management utilities.

**Key Functions:**
- `getFavoriteConfigs()` - Gets all favorite test configurations
- `isConfigFavorited(config)` - Checks if config is favorited
- `addFavoriteConfig(config)` - Adds a favorite config
- `removeFavoriteConfig(config)` - Removes a favorite config
- `toggleFavoriteConfig(config)` - Toggles favorite status

**Important Notes:**
- Stores favorites in localStorage
- Manages favorite test configurations for quick access

### `testParams.ts`
Test parameter building and management utilities.

**Key Functions:**
- `buildTestParams(eventName, settings)` - Builds test parameters from settings
- `saveTestParams(params)` - Saves test parameters to localStorage

**Important Notes:**
- Converts UI settings to test parameters
- Manages test configuration persistence

### `contactUtils.ts`
Contact form submission utilities.

**Key Functions:**
- `handleContactSubmission(name, email, message)` - Submits contact form

**Important Notes:**
- Integrates with `/api/contact` endpoint
- Handles form validation and submission

### `careersUtils.ts`
Career-related utility functions.

**Key Functions:**
- `handleCareersSubmission(data)` - Handles career submission

### `explanationLogic.ts`
Explanation processing utilities for MCQ and FRQ explanations.

**Key Functions:**
- `processMcqExplanation(explanation)` - Processes MCQ explanation text
- `processFrqExplanation(explanation)` - Processes FRQ explanation text

**Important Notes:**
- Formats AI-generated explanations
- Handles markdown and formatting

### `leaderboardUtils.ts`
Leaderboard management utilities.

**Key Functions:**
- Leaderboard data processing
- Ranking calculations
- Performance metrics

### `MarkdownExplanation.tsx`
React component for rendering markdown explanations.

**Important Notes:**
- Renders AI-generated explanations with markdown support
- Handles code blocks, lists, and formatting

## Important Notes

1. **Client-Side Only**: Most utilities are client-side only (marked with `"use client"`)
2. **LocalStorage**: Many utilities use localStorage for persistence
3. **API Integration**: Utilities integrate with `/api` endpoints for server operations
4. **Type Safety**: All utilities are fully typed with TypeScript interfaces
5. **Error Handling**: Utilities include error handling and logging
6. **Offline Support**: `db.ts` provides offline question caching via IndexedDB

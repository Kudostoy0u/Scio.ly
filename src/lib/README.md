# Library Directory

This directory contains the core business logic, utilities, and shared services for the Scio.ly platform. Organized into database management, API utilities, services, and utility functions.

## Database Management (`/db/`)

### `index.ts`
Main database connection and configuration.

**Features:**
- Database connection pooling
- Drizzle ORM setup
- Connection management

### `schema.ts`
Database schema definitions using Drizzle ORM.

**Key Tables:**
- `questions` - Main question bank with metadata
- `quotes` - Short quotes for Codebusters
- `longquotes` - Longer quotes and content
- `shareLinks` - Test sharing functionality
- `edits` - Question edit tracking
- `blacklists` - Content blacklisting system
- `idEvents` - Event identification data
- `base52Codes` - Base52 encoding for question IDs
- `newTeamGroups` - Team groups (school + division)
- `newTeamUnits` - Individual team instances
- `newTeamMemberships` - Team membership records

**Example:**
```23:36:src/lib/db/schema.ts
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey(),
  question: text("question").notNull(),
  tournament: text("tournament").notNull(),
  division: text("division").notNull(),
  options: jsonb("options").default("[]"),
  answers: jsonb("answers").notNull(),
  subtopics: jsonb("subtopics").default("[]"),
  difficulty: numeric("difficulty").default("0.5"),
  event: text("event").notNull(),
  randomF: doublePrecision("random_f").notNull().default(sql`random()`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Important Notes:**
- Uses Drizzle ORM for type-safe database operations
- PostgreSQL schema definitions
- JSONB columns for flexible data storage
- Random field for efficient random selection

### `pool.ts`
Database connection pooling.

**Features:**
- Connection management
- Pool configuration
- Connection reuse

### `teams.ts`
Team-related database operations.

**Features:**
- Team CRUD operations
- Member management
- Uses CockroachDB for team data

### `teamExtras.ts`
Extended team functionality.

**Features:**
- Team analytics
- Advanced team operations

### `notifications.ts`
Notification system database operations.

**Features:**
- Notification CRUD
- User notifications

### `utils.ts`
Database utility functions.

**Features:**
- Query helpers
- Database utilities

## API Layer (`/api/`)

### `auth.ts`
Authentication utilities.

**Features:**
- User authentication
- Session management
- Auth state validation

**Dependencies:**
- Supabase Auth
- JWT handling

### `rateLimit.ts`
API rate limiting.

**Features:**
- Request throttling
- Abuse prevention
- Rate limit presets

### `utils.ts`
API utility functions.

**Features:**
- Response formatting
- Error handling
- Request validation

## Services (`/services/`)

### `gemini.ts`
Google Gemini AI integration service.

**Key Features:**
- Question explanation generation
- Free response grading
- Question analysis and improvement
- Content validation
- Image processing for questions
- Multiple API key support with retry logic

**Example:**
```20:32:src/lib/services/gemini.ts
export class GeminiService {
  private clientManager: GeminiClientManager;

  /**
   * Initializes the Gemini service with available API keys
   */
  constructor() {
    this.clientManager = new GeminiClientManager();

    if (!this.clientManager.hasClients()) {
      throw new Error("No Gemini API clients available");
    }
  }
```

**Key Methods:**
- `explain()` - Generate question explanations
- `gradeFreeResponses()` - Grade free response questions
- `suggestEdit()` - Suggest question improvements
- `validateEdit()` - Validate question edits
- `analyzeQuestion()` - Analyze question quality
- `extractQuestions()` - Extract questions from text
- `improveReason()` - Improve user reasoning

**Important Notes:**
- Retries with different API keys on failure
- Supports multiple Gemini API keys for load balancing
- 60-second max duration for operations
- Comprehensive error handling

### `teams.ts`
Team management service.

**Features:**
- Team operations
- Member management

### `cockroachdb-teams.ts`
CockroachDB team operations.

**Features:**
- Advanced team functionality
- Team analytics
- Distributed team data

### `team-data.ts`
Team data processing.

**Features:**
- Team data aggregation
- Performance analytics

### `roster-notifications.ts`
Team roster notification system.

**Features:**
- Roster change notifications
- Member update notifications

## Database Connections

### `supabase.ts`
Supabase client configuration.

**Features:**
- Browser client setup
- Authentication configuration
- User profile management

### `supabaseServer.ts`
Server-side Supabase operations.

**Features:**
- Server-side authentication
- User management

### `cockroachdb.ts`
CockroachDB connection and operations.

**Features:**
- CockroachDB-specific operations
- Team data management

## Utility Functions (`/utils/`)

### `logger.ts`
Logging utilities.

**Example:**
```13:47:src/lib/utils/logger.ts
const logger = {
  log: (...args: unknown[]) => {
    if (getIsDeveloperMode()) {
      // biome-ignore lint/suspicious/noConsole lint/suspicious/noConsoleLog: Logger intentionally uses console
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (!getIsTest()) {
      // biome-ignore lint/suspicious/noConsole: Logger intentionally uses console
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (!getIsTest()) {
      // biome-ignore lint/suspicious/noConsole: Logger intentionally uses console
      console.error(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (getIsDev()) {
      // biome-ignore lint/suspicious/noConsole: Logger intentionally uses console
      console.info("[INFO]", ...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (getIsDev()) {
      // biome-ignore lint/suspicious/noConsole: Logger intentionally uses console
      console.debug(...args);
    }
  },
```

**Features:**
- Environment-aware logging
- Developer mode support
- Test mode suppression
- Structured logging

### `base52.ts`
Base52 encoding/decoding for question IDs.

**Features:**
- URL-safe encoding
- ID generation
- Database integration

### `grade.ts`
Grading utilities and algorithms.

**Features:**
- Score calculation
- Grading logic
- Letter grade conversion

### `markdown.ts`
Markdown processing utilities.

**Features:**
- Markdown parsing
- Rendering
- LaTeX math normalization

### `network.ts`
Network utilities.

**Features:**
- HTTP requests
- Network operations
- Error handling

### `preloadImage.ts`
Image preloading utilities.

**Features:**
- Image caching
- Preloading
- Performance optimization

### `storage.ts`
Browser storage utilities.

**Features:**
- LocalStorage management
- SessionStorage management
- Cross-tab synchronization

### `string.ts`
String manipulation utilities.

**Features:**
- Text processing
- Formatting
- Validation

### `team-resolver.ts`
Team resolution utilities.

**Features:**
- Team slug resolution
- Team data lookup
- Team validation

## Hooks (`/hooks/`)

### `useInfiniteScroll.ts`
Infinite scroll functionality hook.

**Features:**
- Intersection Observer API integration
- Automatic scroll detection
- Performance optimized

## Important Notes

1. **Database**: Uses Drizzle ORM with PostgreSQL (Supabase) and CockroachDB
2. **AI Integration**: Google Gemini 2.0 Flash with multiple API key support
3. **Logging**: Environment-aware logging system
4. **Type Safety**: Full TypeScript support throughout
5. **Error Handling**: Comprehensive error handling
6. **Testing**: Many utilities have test files

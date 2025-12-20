# API Directory

This directory contains all Next.js API routes for the Scio.ly platform. These routes handle backend functionality including authentication, question management, team operations, AI integration, and more.

## Core API Routes

### `/admin/`
Administrative API endpoints. See [admin/README.md](./admin/README.md) for details.

**Files:**
- `route.ts` - Admin operations (GET for overview, POST for actions)

**Features:**
- Edit management (apply, undo, delete)
- Blacklist management (apply, restore, delete)
- Bulk operations
- Admin password authentication

### `/assignments/`
Assignment management system.

**Files:**
- `route.ts` - Main assignments endpoint
- `submit/route.ts` - Assignment submission
- `[assignmentId]/route.ts` - Assignment by ID
- `[assignmentId]/submit/route.ts` - Submit specific assignment
- `find-team/route.ts` - Find team for assignment

**Features:**
- Assignment CRUD operations
- Assignment submission handling
- Team assignment management

### `/blacklists/`
Content blacklisting system.

**Files:**
- `route.ts` - Blacklist management

**Features:**
- Add questions to blacklist
- Remove from blacklist
- Blacklist querying

### `/codebusters/`
Codebusters event-specific API.

**Files:**
- `share/generate/route.ts` - Generate share code
- `share/route.ts` - Share code operations

**Features:**
- Cipher sharing
- Share code generation
- Codebusters-specific operations

### `/contact/`
Contact form API.

**Files:**
- `route.ts` - Contact form submission

**Example:**
```44:50:src/app/api/contact/route.ts
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting to prevent spam
    const rateLimitError = applyRateLimit(req, RateLimitPresets.standard);
    if (rateLimitError) {
      return rateLimitError;
    }
```

**Features:**
- Contact form processing
- Rate limiting
- Discord webhook integration
- Email notifications

### `/docs/`
Documentation API.

**Files:**
- `route.ts` - Documentation serving
- `codebusters/[cipher]/route.ts` - Codebusters cipher documentation

**Features:**
- Markdown content serving
- Cipher documentation
- Content management

### `/edits/`
Content editing API.

**Files:**
- `route.ts` - Edit operations

**Features:**
- Question edit submission
- Edit validation
- Edit management

## AI Integration Routes (`/gemini/`)

All Gemini endpoints use Google Gemini 2.0 Flash for AI operations. See [gemini/README.md](./gemini/README.md) for detailed documentation.

### `/gemini/explain/`
AI explanation generation endpoint.

**Example:**
```15:49:src/app/api/gemini/explain/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateFields<ExplainRequest>(body, ["question", "event"]);

    if (!validation.valid) {
      return validation.error;
    }

    const { question, event, userAnswer } = validation.data;

    logger.info(`Gemini explain request received for event: ${event}`);

    if (!geminiService.isAvailable()) {
      logger.warn("Gemini AI not available");
      return ApiErrors.serverError("Gemini AI not available");
    }

    logger.info("Sending explain request to Gemini AI");

    try {
      const result = await geminiService.explain(question, userAnswer || "", event);

      logger.info("Gemini AI explain response received");

      return successResponse<ApiResponse["data"]>(result);
    } catch (error) {
      logger.error("Gemini AI explain error:", error);
      return ApiErrors.serverError("Failed to generate explanation");
    }
  } catch (error) {
    logger.error("POST /api/gemini/explain error:", error);
    return handleApiError(error);
  }
}
```

**Features:**
- Generates AI explanations for questions
- Supports optional user answer context
- Event-specific explanations
- 60-second max duration

### `/gemini/analyze-question/`
AI-powered question analysis.

**Features:**
- Question quality analysis
- Content validation
- Difficulty assessment
- Topic classification

### `/gemini/extract-questions/`
Question extraction from text.

**Features:**
- Automated question extraction
- Text-to-question conversion
- Format standardization

### `/gemini/grade-free-responses/`
AI grading of free response questions.

**Features:**
- Automated FRQ grading
- Rubric-based scoring
- Feedback generation

### `/gemini/improve-reason/`
AI improvement of user reasoning.

**Features:**
- Reasoning analysis
- Improvement suggestions
- Logic validation

### `/gemini/suggest-edit/`
AI-powered edit suggestions.

**Features:**
- Content improvement suggestions
- Grammar correction
- Style enhancement

### `/gemini/validate-edit/`
AI validation of content edits.

**Features:**
- Edit quality validation
- Content accuracy checking
- Validation scoring

## System Routes

### `/health/`
System health monitoring.

**Files:**
- `route.ts` - Health check endpoint
- `__tests__/route.test.ts` - Health check tests

**Features:**
- Database connectivity check
- AI service status
- System health indicators

### `/id-questions/`
Question identification API.

**Files:**
- `route.ts` - ID question operations

**Features:**
- Question metadata
- ID question identification

### `/join/`
User registration API.

**Files:**
- `route.ts` - User registration

**Features:**
- User onboarding
- Account creation
- Profile setup

## Question Management Routes

### `/questions/`
Question management API.

**Files:**
- `route.ts` - Main questions endpoint (GET, POST)
- `base52/route.ts` - Base52 encoded question IDs
- `batch/route.ts` - Batch question operations

**Example:**
```1:80:src/app/api/questions/route.ts
import crypto from "node:crypto";
import { ApiError, handleApiError, parseRequestBody } from "@/lib/api/utils";
import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import type { Question } from "@/lib/types/api";
import logger from "@/lib/utils/logger";
import { type SQL, and, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Feature flag: when true, use efficient two-phase indexed random selection
const trulyRandom = true;

type DatabaseQuestion = {
  id: string;
  question: string;
  tournament: string;
  division: string;
  event: string;
  difficulty: string | null;
  options: unknown;
  answers: unknown;
  subtopics: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const QuestionFiltersSchema = z.object({
  event: z.string().optional(),
  division: z.string().optional(),
  tournament: z.string().optional(),
  subtopic: z.string().optional(),
  subtopics: z.string().optional(),
  difficulty_min: z.string().optional(),
  difficulty_max: z.string().optional(),
  question_type: z.enum(["mcq", "frq"]).optional(),
  limit: z.string().optional(),
});

const CreateQuestionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  tournament: z.string().min(1, "Tournament is required"),
  division: z.string().min(1, "Division is required"),
  event: z.string().min(1, "Event is required"),
  options: z.array(z.string()).optional().default([]),
  answers: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .default([]),
  subtopics: z.array(z.string()).optional().default([]),
  difficulty: z.number().min(0).max(1).optional().default(0.5),
});
```

**Features:**
- Question querying with filters (event, division, difficulty, type)
- Question creation
- Efficient random selection
- Base52 encoding for question IDs
- Batch operations

## Team Management Routes (`/teams/`)

Comprehensive team management API. See [teams/README.md](./teams/README.md) for detailed documentation.

### `/teams/create/`
Team creation API.

**Features:**
- Team creation
- Validation
- Initial setup

### `/teams/by-code/`
Team lookup by code.

**Features:**
- Team code validation
- Team retrieval

### `/teams/[teamId]/`
Team operations by ID.

**Subdirectories:**
- `assignments/` - Assignment management
- `members/` - Member management
- `roster/` - Roster management
- `stream/` - Activity stream
- `timers/` - Timer management
- `subteams/` - Subteam management
- `invite/` - Team invitations
- `codes/` - Team codes
- `archive/` - Team archiving
- `delete/` - Team deletion
- `exit/` - Exit team
- `all-data/` - All team data

**Features:**
- Comprehensive team operations
- Member management
- Assignment system
- Activity stream
- Timer management

### `/teams/v2/`
Version 2 team API with enhanced features.

**Features:**
- Enhanced team operations
- Improved performance
- Additional features

## Other Routes

### `/invites/`
Team invitation system.

**Subdirectories:**
- `accept/route.ts` - Accept invitation
- `create/route.ts` - Create invitation
- `decline/route.ts` - Decline invitation
- `my/route.ts` - User's invitations

### `/meta/`
Metadata API endpoints.

**Subdirectories:**
- `events/route.ts` - Events metadata
- `stats/route.ts` - Statistics
- `subtopics/route.ts` - Subtopics metadata
- `tournaments/route.ts` - Tournaments metadata

### `/notifications/`
Notification system.

**Subdirectories:**
- `accept/route.ts` - Accept notification
- `decline/route.ts` - Decline notification
- `route.ts` - Notification operations
- `sync/` - Notification sync

### `/profile/`
Profile management API.

**Subdirectories:**
- `sync/route.ts` - Profile synchronization

### `/quotes/`
Quote management API.

**Files:**
- `route.ts` - Quote operations
- `report/route.ts` - Quote reporting

**Features:**
- Quote CRUD operations
- Quote reporting
- Codebusters quote management

### `/report/`
Reporting system API.

**Subdirectories:**
- `all/route.ts` - All reports
- `edit/route.ts` - Edit reports
- `meta/route.ts` - Report metadata
- `remove/route.ts` - Remove reports

**Features:**
- Report submission
- Report management
- Report moderation

### `/share/`
Content sharing API.

**Subdirectories:**
- `generate/route.ts` - Generate share code
- `route.ts` - Share operations

**Features:**
- Share code generation
- Content sharing
- Share code validation

### `/trpc/`
TRPC API endpoint.

**Files:**
- `[trpc]/route.ts` - TRPC handler

**Features:**
- TRPC protocol support
- Type-safe API calls

### `/upload-image/`
Image upload API.

**Files:**
- `route.ts` - Image upload handler

**Features:**
- Image processing
- Storage management
- Image validation

## Important Notes

1. **Rate Limiting**: Many endpoints use rate limiting to prevent abuse
2. **Authentication**: Most endpoints require user authentication
3. **Error Handling**: Comprehensive error handling with structured responses
4. **Validation**: Request validation using Zod schemas
5. **Logging**: All endpoints use structured logging
6. **Type Safety**: Full TypeScript support with type-safe responses
7. **Testing**: Many endpoints have comprehensive test suites

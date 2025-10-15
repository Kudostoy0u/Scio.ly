# Assignment System Architecture - Complete End-to-End Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Flow](#data-flow)
4. [Frontend-Backend Contract](#frontend-backend-contract)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Question Format Specification](#question-format-specification)
8. [Validation & Error Handling](#validation--error-handling)
9. [Testing](#testing)

---

## Overview

The assignment system allows team captains to create assignments with auto-generated questions, distribute them to team members, and track submissions and grades.

### Key Features
- Auto-generate questions from question bank
- Support for Multiple Choice (MCQ) and Free Response (FRQ) questions
- Image support for ID questions
- Automatic grading for MCQ
- Manual/AI grading for FRQ
- Roster management
- Submission tracking

### Critical Design Principles

1. **answers field is ALWAYS present**: Every question MUST have a valid, non-empty `answers` array
2. **Fail fast**: Invalid questions are rejected immediately with clear error messages
3. **Type safety**: Use Drizzle ORM for database operations
4. **Immutability**: The `answers` field is never modified during normalization
5. **Frontend-Backend separation**: Clear contract between frontend and backend data formats

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React/Next.js)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐│
│  │ Assignment       │   │ Question         │   │ Test Taking      ││
│  │ Creator          │   │ Preview          │   │ Interface        ││
│  │                  │   │                  │   │                  ││
│  │ - Event select   │   │ - Display Q&A    │   │ - Answer input   ││
│  │ - Parameters     │   │ - Image support  │   │ - Timer          ││
│  │ - Roster         │   │ - Validation     │   │ - Submit         ││
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘│
│           │                      │                       │          │
│           └──────────────┬───────┴───────────────────────┘          │
│                          │                                          │
│                          ▼                                          │
│           ┌─────────────────────────────────┐                       │
│           │   Question Data (Runtime)       │                       │
│           │   Format: Frontend Contract     │                       │
│           │   {                             │                       │
│           │     question: string            │                       │
│           │     options: string[]           │                       │
│           │     answers: number[]  ◄────────┼── CRITICAL           │
│           │     type: 'mcq' | 'frq'         │                       │
│           │   }                             │                       │
│           └────────────┬────────────────────┘                       │
└────────────────────────┼───────────────────────────────────────────┘
                         │
                         │ HTTP Request (JSON)
                         │
┌────────────────────────▼───────────────────────────────────────────┐
│                        API LAYER (Next.js API Routes)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  POST /api/teams/[id]/assignments/generate-questions          │  │
│  │                                                                │  │
│  │  1. Fetch questions from /api/questions                       │  │
│  │  2. Validate each question has valid answers                  │  │
│  │  3. Convert to frontend format                                │  │
│  │  4. REJECT questions without answers                          │  │
│  │                                                                │  │
│  │  Input:  { event_name, question_count, question_types }       │  │
│  │  Output: { questions: [...], metadata: {...} }                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  POST /api/teams/[id]/assignments                             │  │
│  │                                                                │  │
│  │  1. Validate ALL questions have answers field                 │  │
│  │  2. Convert frontend format → database format                 │  │
│  │  3. Save to new_team_assignment_questions                     │  │
│  │  4. REJECT if any question invalid                            │  │
│  │                                                                │  │
│  │  Input:  { title, questions: [...] }                          │  │
│  │  Output: { assignment: {...} }                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  GET /api/assignments/[id]                                     │  │
│  │                                                                │  │
│  │  1. Load from new_team_assignment_questions                   │  │
│  │  2. Convert database format → frontend format                 │  │
│  │  3. Validate converted answers are valid                      │  │
│  │  4. REJECT if any question has invalid answers                │  │
│  │                                                                │  │
│  │  Input:  assignmentId (path param)                            │  │
│  │  Output: { assignment: {...}, questions: [...] }              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└────────────────────────┬───────────────────────────────────────────┘
                         │
                         │ Drizzle ORM
                         │
┌────────────────────────▼───────────────────────────────────────────┐
│                    DATABASE (CockroachDB/PostgreSQL)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ new_team_assignment_questions                                │   │
│  │                                                              │   │
│  │ - id: UUID                                                   │   │
│  │ - assignment_id: UUID                                        │   │
│  │ - question_text: TEXT                                        │   │
│  │ - question_type: TEXT ('multiple_choice', 'free_response')   │   │
│  │ - options: JSONB (array of strings for MCQ)                  │   │
│  │ - correct_answer: TEXT ◄───────────────────────────────────┐│   │
│  │     MCQ: "A" or "A,B" (letters)                            ││   │
│  │     FRQ: "answer text"                                      ││   │
│  │ - points: INTEGER                                           ││   │
│  │ - order_index: INTEGER                                      ││   │
│  │ - image_data: TEXT                                          ││   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────── ┘
```

---

## Data Flow

### 1. Assignment Creation Flow

```
┌────────────┐
│  Captain   │
│  selects   │
│  event &   │
│  params    │
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: EnhancedAssignmentCreator.tsx                          │
│                                                                   │
│ POST /api/teams/[teamId]/assignments/generate-questions          │
│ Body: {                                                           │
│   event_name: "Designer Genes",                                  │
│   question_count: 10,                                             │
│   question_types: ["multiple_choice"],                           │
│   division: "C"                                                   │
│ }                                                                 │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: generate-questions/route.ts                             │
│                                                                   │
│ 1. Fetch questions from /api/questions?event=Designer+Genes      │
│                                                                   │
│ 2. For each question:                                             │
│    - Extract answers from q.answers or q.correct_answer           │
│    - VALIDATE: answers.length > 0                                │
│    - Convert to frontend format                                   │
│                                                                   │
│ 3. Return questions array:                                        │
│    [{                                                             │
│      question_text: "Centromeres of sister chromatids...",        │
│      question_type: "multiple_choice",                            │
│      options: ["Metaphase I", "Metaphase II", ...],              │
│      answers: [3],  ◄─────────────────────── GUARANTEED PRESENT  │
│      points: 1,                                                   │
│      order_index: 0                                               │
│    }]                                                             │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: QuestionPreviewStep.tsx                                │
│                                                                   │
│ Display questions with options and correct answers highlighted   │
│ User can review and confirm                                       │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: RosterSelectionStep.tsx                                │
│                                                                   │
│ User assigns questions to specific students                       │
│ POST /api/teams/[teamId]/assignments                             │
│ Body: {                                                           │
│   title: "Designer Genes Practice",                              │
│   questions: [{                                                   │
│     question_text: "...",                                         │
│     question_type: "multiple_choice",                             │
│     options: [...],                                               │
│     answers: [3],  ◄──────────────────────── Validated           │
│     points: 1                                                     │
│   }],                                                             │
│   roster: [...]                                                   │
│ }                                                                 │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: assignments/route.ts                                     │
│                                                                   │
│ 1. VALIDATE each question has answers array                      │
│    if (!q.answers || q.answers.length === 0) throw Error         │
│                                                                   │
│ 2. Convert answers to database format:                           │
│    Frontend: [3] → Database: "D" (letter)                        │
│    Frontend: [1,2] → Database: "B,C" (letters)                   │
│    Frontend: ["Paris"] → Database: "Paris" (string)              │
│                                                                   │
│ 3. Insert into new_team_assignment_questions:                    │
│    {                                                              │
│      question_text: "...",                                        │
│      question_type: "multiple_choice",                            │
│      options: "[\"Metaphase I\", \"Metaphase II\", ...]",         │
│      correct_answer: "D",  ◄─────────────────────────────────────┤
│      points: 1,                                                   │
│      order_index: 0                                               │
│    }                                                              │
└───────────────────────────────────────────────────────────────────┘
```

### 2. Assignment Loading & Taking Flow

```
┌────────────┐
│  Student   │
│  clicks    │
│  assignment│
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: /assign-new/[id]/page.tsx or /test/page.tsx            │
│                                                                   │
│ GET /api/assignments/[assignmentId]                              │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: assignments/[assignmentId]/route.ts                     │
│                                                                   │
│ 1. SELECT * FROM new_team_assignment_questions                   │
│    WHERE assignment_id = ?                                        │
│                                                                   │
│ 2. For each question from database:                              │
│    {                                                              │
│      question_text: "...",                                        │
│      question_type: "multiple_choice",                            │
│      options: "[\"Metaphase I\", \"Metaphase II\", ...]",         │
│      correct_answer: "D"  ◄───────────────────────────────────┐  │
│    }                                                            │  │
│                                                                  │  │
│ 3. Convert database format → frontend format:                   │  │
│    - Parse options JSON                                          │  │
│    - Convert correct_answer "D" → answers [3]                    │  │
│    - VALIDATE: answers.length > 0                               │  │
│    - REJECT if invalid                                           │  │
│                                                                  │  │
│ 4. Return to frontend:                                           │  │
│    {                                                              │  │
│      question: "...",                                             │  │
│      type: "mcq",                                                 │  │
│      options: ["Metaphase I", "Metaphase II", ...],              │  │
│      answers: [3],  ◄──────────────────── GUARANTEED VALID       │  │
│      points: 1                                                    │  │
│    }                                                              │  │
└─────┬─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: useTestState.ts                                         │
│                                                                   │
│ 1. Receive questions from API                                     │
│ 2. Pass through normalizeQuestionsFull()                          │
│    - DOES NOT modify answers field                               │
│    - Only normalizes text (question, options)                    │
│    - Validates answers is present                                │
│ 3. Store in React state                                           │
│ 4. Render with Content.tsx / QuestionCard.tsx                    │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Student answers questions                               │
│                                                                   │
│ userAnswers state: {                                              │
│   0: [3],      // Student selected option 3 for question 0       │
│   1: [1, 2],   // Student selected options 1 and 2 for Q1        │
│   2: ["Paris"] // Student typed "Paris" for Q2                   │
│ }                                                                 │
└─────┬───────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Student clicks Submit                                  │
│                                                                   │
│ Grading Logic (client-side for MCQ):                             │
│   questions[0].answers = [3]  ← correct answer                   │
│   userAnswers[0] = [3]        ← student answer                   │
│   → CORRECT ✓                                                    │
│                                                                   │
│   questions[1].answers = [1, 2]                                  │
│   userAnswers[1] = [1, 2]                                        │
│   → CORRECT ✓                                                    │
│                                                                   │
│ POST /api/assignments/[id]/submit                                │
│ Body: {                                                           │
│   answers: { ... },                                               │
│   score: 8,                                                       │
│   totalPoints: 10                                                 │
│ }                                                                 │
└───────────────────────────────────────────────────────────────────┘
```

---

## Frontend-Backend Contract

### Question Data Format

#### Frontend Format (Runtime)
Used in React components, passed between frontend code:

```typescript
interface FrontendQuestion {
  id: string;
  question: string;                    // Question text (normalized)
  type: 'mcq' | 'frq' | 'codebusters'; // Question type
  options?: string[];                  // For MCQ only
  answers: (number | string)[];        // CRITICAL: Always present
                                       // MCQ: [0], [1, 2] (indices)
                                       // FRQ: ["answer text"]
  points: number;                      // Score value
  order: number;                       // Display order
  imageData?: string;                  // Optional image URL

  // Optional metadata
  difficulty?: number;
  division?: string;
  event?: string;
  subtopics?: string[];
  tournament?: string;
}
```

#### Backend/Database Format
Stored in `new_team_assignment_questions` table:

```typescript
interface DatabaseQuestion {
  id: UUID;
  assignment_id: UUID;
  question_text: TEXT;                 // Question text (raw)
  question_type: TEXT;                 // 'multiple_choice', 'free_response', 'codebusters'
  options: JSONB;                      // For MCQ: ["Option A", "Option B"]
  correct_answer: TEXT;                // MCQ: "A" or "A,B" (letters)
                                       // FRQ: "answer text"
  points: INTEGER;                     // Score value
  order_index: INTEGER;                // Display order
  image_data: TEXT;                    // Optional image URL
}
```

### Format Conversion Rules

#### Frontend → Backend (Saving)
```typescript
// MCQ Example
Frontend:  { answers: [0], options: ["A", "B", "C"] }
Backend:   { correct_answer: "A", options: "[\"A\", \"B\", \"C\"]" }

Frontend:  { answers: [1, 3], options: ["A", "B", "C", "D"] }
Backend:   { correct_answer: "B,D", options: "[\"A\", \"B\", \"C\", \"D\"]" }

// FRQ Example
Frontend:  { answers: ["Paris"] }
Backend:   { correct_answer: "Paris", options: null }
```

#### Backend → Frontend (Loading)
```typescript
// MCQ Example
Backend:   { correct_answer: "A", options: "[\"A\", \"B\", \"C\"]" }
Frontend:  { answers: [0], options: ["A", "B", "C"] }

Backend:   { correct_answer: "B,D", options: "[\"A\", \"B\", \"C\", \"D\"]" }
Frontend:  { answers: [1, 3], options: ["A", "B", "C", "D"] }

// FRQ Example
Backend:   { correct_answer: "Paris", options: null }
Frontend:  { answers: ["Paris"], options: undefined }
```

---

## Validation & Error Handling

### Question Generation API Validation

**Location**: `src/app/api/teams/[teamId]/assignments/generate-questions/route.ts`

```typescript
// VALIDATION 1: Pre-filter questions
questions.filter(q => q && (q.options?.length > 0 || q.answers?.length > 0))

// VALIDATION 2: Extract answers with error handling
if (!answers || answers.length === 0) {
  throw new Error(
    `Question "${q.question}" has no valid answers. ` +
    `Cannot generate assignment with invalid questions.`
  );
}

// VALIDATION 3: Double-check formatted question
if (!formattedQuestion.answers || formattedQuestion.answers.length === 0) {
  throw new Error(`INTERNAL ERROR: Formatted question has invalid answers`);
}
```

### Assignment Creation Validation

**Location**: `src/app/api/teams/[teamId]/assignments/route.ts`

```typescript
// VALIDATION 1: Check question fields
if (!question.question_text || question.question_text.trim() === '') {
  throw new Error(`Question ${index + 1} is missing question_text`);
}

// VALIDATION 2: Check answers field
if (!question.answers || !Array.isArray(question.answers) || question.answers.length === 0) {
  throw new Error(
    `Cannot create assignment: Question ${index + 1} has no valid answers. ` +
    `Question: "${question.question_text?.substring(0, 50)}..." ` +
    `All questions must have a valid answers array before being saved.`
  );
}

// VALIDATION 3: Validate correct_answer conversion
if (!correctAnswer || correctAnswer.trim() === '') {
  throw new Error(`Failed to convert answers to correct_answer for question ${index + 1}`);
}
```

### Assignment Loading Validation

**Location**: `src/app/api/assignments/[assignmentId]/route.ts`

```typescript
// VALIDATION 1: Validate database data
if (answerParts.length === 0) {
  throw new Error(`Invalid correct_answer format for MCQ question ${index + 1}: "${q.correct_answer}"`);
}

// VALIDATION 2: Validate answer indices
if (idx < 0 || idx >= (options?.length || 0)) {
  throw new Error(`Answer letter "${part}" out of range for question ${index + 1} with ${options?.length || 0} options`);
}

// VALIDATION 3: Final check before returning
if (!answers || answers.length === 0) {
  throw new Error(
    `Assignment question ${index + 1} has no valid answers. ` +
    `This assignment cannot be loaded until all questions have valid answers. ` +
    `Please contact an administrator to fix this assignment.`
  );
}
```

### Frontend Normalization Validation

**Location**: `src/app/test/hooks/utils/normalize.ts`

```typescript
// VALIDATION: Detect missing answers (logs error but doesn't throw)
if (!out.answers || !Array.isArray(out.answers) || out.answers.length === 0) {
  console.error(`❌ Question ${index + 1} missing valid answers field:`, {
    question: out.question,
    hasAnswers: !!out.answers,
    isArray: Array.isArray(out.answers),
    length: out.answers?.length
  });
}
```

---

## Testing

### Unit Tests

**Normalization Tests**: `src/app/test/hooks/utils/normalize.test.ts`
- ✅ Preserves numeric answers for MCQ
- ✅ Preserves string answers for FRQ
- ✅ Handles missing answers gracefully
- ✅ Validates answers field presence

### Integration Tests

**Assignment Generation Tests**: `src/app/api/teams/[teamId]/assignments/generate-questions/route.test.ts`
- ✅ Validates question format
- ✅ Throws error for missing answers
- ✅ Extracts answers correctly
- ✅ Formats questions properly

**Test State Tests**: `src/app/test/hooks/useTestState.test.ts`
- ✅ Validates assignment questions on load
- ✅ Detects undefined answers
- ✅ Handles localStorage data correctly

---

## Summary

This assignment system ensures **data integrity at every step**:

1. **Generation**: Questions without answers are rejected
2. **Creation**: Questions are validated before saving
3. **Storage**: Database stores in standard format
4. **Loading**: Data is validated during conversion
5. **Normalization**: Answers field is preserved immutably
6. **Grading**: Answers are used directly for scoring

The **answers field is the source of truth** and is **never undefined, null, or empty** in valid questions.

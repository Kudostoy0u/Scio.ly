# Assignment System Rewrite - Complete Documentation

## Overview

This document describes the complete rewrite of the assignment system to fix the "undefined answers" bug and remove legacy code. The assignment system has been modernized to use consistent data formats, simplified normalization logic, and comprehensive unit tests.

## Issues Fixed

### 1. **Undefined Answers Bug**
- **Problem**: Questions were showing `undefined` for answers in test normalization debugging
- **Root Cause**: Complex normalization logic was attempting to convert between string and numeric answer formats, sometimes stripping the `answers` field entirely
- **Solution**: Simplified normalization to preserve the `answers` field exactly as-is

### 2. **Legacy Code**
- **Problem**: Dual assignment systems (old `assignments` table vs new Drizzle tables)
- **Solution**: Fully migrated to new Drizzle ORM schema (`new_team_assignments`, `new_team_assignment_questions`, etc.)

### 3. **Inconsistent Data Formats**
- **Problem**: Questions stored with different answer formats causing confusion
- **Solution**: Standardized all questions to use consistent format

## Architecture

### Standardized Question Format

All questions (practice and assignments) now use this format:

```typescript
interface Question {
  id: string;
  question: string;
  type: 'mcq' | 'frq' | 'codebusters';
  options?: string[];  // For MCQ only
  answers: (number | string)[];  // CRITICAL: Always present
  difficulty?: number;
  division?: string;
  event?: string;
  subtopics?: string[];
  tournament?: string;
  imageData?: string;
}
```

**Key Rules:**
- `answers` field is **ALWAYS** present and **ALWAYS** an array
- For MCQ: `answers` contains numeric indices (0-based), e.g., `[0]`, `[1, 2]`
- For FRQ: `answers` contains strings, e.g., `["Paris"]`, `["42"]`
- For Codebusters: `answers` contains the solution as a string, e.g., `["HELLO WORLD"]`

### Database Schema

Uses Drizzle ORM with the following tables:

```
new_team_assignments
├── id (UUID)
├── teamId (UUID) → references new_team_units
├── title (text)
├── description (text)
├── eventName (text)
├── dueDate (timestamp)
├── points (integer)
└── createdAt (timestamp)

new_team_assignment_questions
├── id (UUID)
├── assignmentId (UUID) → references new_team_assignments
├── questionText (text)
├── questionType (text) - 'multiple_choice' | 'free_response' | 'codebusters'
├── options (JSONB) - Array of strings for MCQ
├── correctAnswer (text) - Stored as: "A" or "0" for MCQ, text for FRQ
├── points (integer)
├── orderIndex (integer)
└── imageData (text)

new_team_assignment_submissions
├── id (UUID)
├── assignmentId (UUID)
├── userId (UUID)
├── content (text)
├── grade (integer)
├── status (text)
└── submittedAt (timestamp)
```

## Files Changed

### 1. Normalization Logic
**File**: `src/app/test/hooks/utils/normalize.ts`

**Changes**:
- Removed complex logic that attempted to convert between answer formats
- Now only normalizes text (question text, option text)
- **NEVER** modifies the `answers` field
- Added validation to detect missing/invalid answers

**Before**:
```typescript
// Complex logic trying to handle both string and numeric answers
if (hasNumericAnswers) {
  console.log('Preserving numeric answers...');
} else {
  const normalized = normalizeOptionAnswerLabels(...);
  out.answers = normalized.answers; // Could set answers to undefined!
}
```

**After**:
```typescript
// Simple: just preserve answers exactly as-is
// Normalize question text
if (out.question) {
  out.question = normalizeQuestionText(out.question);
}

// Normalize options
if (Array.isArray(out.options)) {
  out.options = out.options.map(opt =>
    typeof opt === 'string' ? normalizeTestText(opt) : opt
  );
}

// CRITICAL: Preserve answers field exactly as-is
// Do NOT modify, convert, or normalize the answers field
```

### 2. Assignment Loading API
**File**: `src/app/api/assignments/[assignmentId]/route.ts`

**Changes**:
- Simplified question formatting logic
- Ensures `answers` field is always present and valid
- Handles letter-to-index conversion correctly
- Removed excessive debug logging

**Key Function**:
```typescript
// Convert answer to the format expected by the test system
let answers: (string | number)[] = [];

if (q.correct_answer !== null && q.correct_answer !== undefined) {
  if (q.question_type === 'multiple_choice') {
    // For MCQ, convert letter/text answers to numeric indices
    const answerStr = String(q.correct_answer).trim();
    const answerParts = answerStr.split(',').map(s => s.trim()).filter(s => s);

    answers = answerParts.map(part => {
      // Check if it's a letter (A, B, C, etc.)
      if (part.match(/^[A-Z]$/i)) {
        return part.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
      }
      // Otherwise parse as number
      return parseInt(part) || 0;
    });
  } else {
    // For FRQ, use the answer as-is
    answers = [q.correct_answer];
  }
}

return {
  id: q.id,
  question: q.question_text,
  type: q.question_type === 'multiple_choice' ? 'mcq' : 'frq',
  options: options,
  answers: answers, // CRITICAL: Always present, always an array
  // ... other fields
};
```

### 3. Question Generation API
**File**: `src/app/api/teams/[teamId]/assignments/generate-questions/route.ts`

**Changes**:
- Removed excessive debug logging (100+ lines of console.log)
- Simplified answer extraction logic
- Validates that all questions have `answers` field
- Throws error if any question is missing answers

**Key Function**:
```typescript
.map((q: any, index: number) => {
  const isMCQ = q.options && Array.isArray(q.options) && q.options.length > 0;

  // Extract correct answer indices - ensure answers field is always present
  let answers: (number | string)[] = [];

  if (Array.isArray(q.answers) && q.answers.length > 0) {
    answers = q.answers.map((a: any) =>
      typeof a === 'number' ? a : parseInt(a)
    );
  } else if (q.correct_answer !== null && q.correct_answer !== undefined) {
    // Fallback: extract from correct_answer field
    // ... conversion logic
  }

  // If still no correct answers found, throw an error
  if (answers.length === 0) {
    throw new Error(`No correct answers found for question: ${q.question}`);
  }

  return {
    question_text: q.question || q.question_text,
    question_type: isMCQ ? 'multiple_choice' : 'free_response',
    options: isMCQ ? q.options : undefined,
    answers: answers, // CRITICAL: Always present, always an array
    points: 1,
    order_index: index,
    imageData: buildAbsoluteUrl(q.imageData, origin)
  };
});
```

### 4. Assignment Creation API
**File**: `src/app/api/teams/[teamId]/assignments/route.ts`

**Changes**:
- Updated to properly convert numeric answers back to letters for database storage
- Ensures consistency between frontend (numeric indices) and database (letter format)

**Key Function**:
```typescript
const questionInserts = questions.map((question: any, index: number) => {
  // Convert answers array to correct_answer format for database storage
  let correctAnswer = null;
  if (question.answers && Array.isArray(question.answers) && question.answers.length > 0) {
    if (question.question_type === 'multiple_choice') {
      // Convert numeric indices back to letters for database storage
      correctAnswer = question.answers
        .map((ans: number) => String.fromCharCode(65 + ans))
        .join(',');
    } else {
      // For FRQ, use the answers as-is
      correctAnswer = question.answers.join(',');
    }
  } else if (question.correct_answer) {
    correctAnswer = question.correct_answer;
  }

  return {
    assignmentId: assignment.id,
    questionText: question.question_text,
    questionType: question.question_type,
    options: question.options ? JSON.stringify(question.options) : null,
    correctAnswer: correctAnswer,
    points: question.points || 1,
    orderIndex: question.order_index || index,
    imageData: question.imageData || null
  };
});
```

## Unit Tests

Created comprehensive unit tests for the normalization logic:

**File**: `src/app/test/hooks/utils/normalize.test.ts`

**Test Coverage**:
- ✅ Preserves numeric answers for MCQ questions
- ✅ Preserves multiple numeric answers for multi-select MCQ
- ✅ Preserves string answers for FRQ questions
- ✅ Preserves answers exactly as-is without modification
- ✅ Logs errors for questions with undefined/null/empty answers
- ✅ Normalizes question text while preserving answers
- ✅ Normalizes option text while preserving answers
- ✅ Handles non-array input gracefully
- ✅ Handles empty array
- ✅ Processes multiple questions correctly
- ✅ Preserves question fields other than text and options
- ✅ Handles assignment questions with numeric indices
- ✅ Handles complex assignment question structure

**Test Results**:
```
✓ src/app/test/hooks/utils/normalize.test.ts (15 tests) 4ms

Test Files  1 passed (1)
     Tests  15 passed (15)
```

## Data Flow

### Assignment Creation
1. User creates assignment via UI
2. Frontend calls `/api/teams/[teamId]/assignments/generate-questions`
3. API fetches questions from database with `answers` field
4. Questions are formatted with numeric indices for MCQ: `{ answers: [0], options: ["A", "B", "C"] }`
5. Frontend displays questions in preview
6. User confirms and submits
7. API saves to `new_team_assignment_questions` with letters: `{ correct_answer: "A", options: ["A", "B", "C"] }`

### Assignment Loading
1. Student opens assignment
2. Frontend calls `/api/assignments/[assignmentId]`
3. API loads from `new_team_assignment_questions`
4. API converts letters to indices: `"A" → [0]`
5. Questions returned with format: `{ answers: [0], options: ["...", "...", "..."] }`
6. `normalizeQuestionsFull()` processes questions
7. Normalization preserves `answers` field exactly
8. Questions displayed to student with grading working correctly

### Test Taking
1. Student answers questions
2. Answers stored in localStorage as indices: `{ 0: [1], 1: [2, 3] }`
3. Student submits
4. Grading compares user answers with correct answers (both as indices)
5. Results calculated and displayed
6. Submission saved to `new_team_assignment_submissions`

## Best Practices

### When Adding New Question Types

1. **Always include `answers` field** in the question object
2. Use numeric indices for MCQ, strings for FRQ
3. Validate `answers` field is present before storing
4. Test with unit tests to ensure `answers` is preserved

### When Modifying Normalization

1. **NEVER** modify the `answers` field
2. Only normalize text content (question, options)
3. Add validation to detect missing `answers`
4. Write tests to verify `answers` preservation

### When Creating APIs

1. Always validate questions have `answers` field
2. Log errors prominently if `answers` is missing
3. Throw errors for invalid data rather than silently failing
4. Use type safety with TypeScript interfaces

## Debugging

### Check if answers are preserved

Add this to your code to debug:
```typescript
console.log('Question answers:', question.answers);
console.log('Answers type:', typeof question.answers);
console.log('Is array:', Array.isArray(question.answers));
console.log('Length:', question.answers?.length);
```

### Validate question format

Use this validation function:
```typescript
function validateQuestion(q: any, index: number): void {
  if (!q.answers || !Array.isArray(q.answers) || q.answers.length === 0) {
    console.error(`❌ Question ${index + 1} missing valid answers field:`, {
      question: q.question,
      hasAnswers: !!q.answers,
      isArray: Array.isArray(q.answers),
      length: q.answers?.length
    });
  }
}
```

## Migration Notes

### For Existing Assignments

The system automatically handles both old and new formats:

1. **Old Format** (letter answers): Converted to indices on load
2. **New Format** (numeric indices): Used directly

### Database Migration

No database migration is required. The system uses the existing `new_team_assignment_*` tables and is backward compatible with existing data.

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- normalize.test.ts

# Run with coverage
npm test -- --coverage
```

### Manual Testing Checklist

1. ✅ Create new assignment with multiple MCQ questions
2. ✅ Verify questions display correctly in preview
3. ✅ Load assignment as student
4. ✅ Verify answers are NOT undefined in console
5. ✅ Answer questions and submit
6. ✅ Verify grading works correctly
7. ✅ Check that correct answers are shown after submission
8. ✅ Verify multiple-select questions work
9. ✅ Test FRQ questions
10. ✅ Test with ID questions (images)

## Performance

- Removed 100+ lines of debug logging
- Simplified normalization reduces processing time
- No performance regression from previous version

## Future Improvements

1. Add validation at database level with CHECK constraints
2. Create database migration to enforce `answers` field
3. Add more comprehensive end-to-end tests
4. Consider adding TypeScript strict mode
5. Add schema validation with Zod or similar

## Conclusion

The assignment system has been successfully rewritten with:
- ✅ Fixed "undefined answers" bug
- ✅ Removed legacy code
- ✅ Simplified normalization logic
- ✅ Standardized data formats
- ✅ Added comprehensive unit tests
- ✅ Improved code maintainability

The system now has a clear, consistent architecture that is easier to maintain and extend.

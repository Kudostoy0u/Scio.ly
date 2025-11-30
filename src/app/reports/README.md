# Reports Directory

This directory contains the reporting system for the Scio.ly platform. Provides functionality for reporting issues, content problems, and feedback.

## Files

### `page.tsx`
Main reports page component.

**Key Features:**
- Report submission interface
- Report listing and management
- Report filtering and pagination
- Report status tracking

## Components

### `components/Pagination.tsx`
Pagination component for report listings.

**Features:**
- Page navigation controls
- Page size selection
- Navigation feedback

### `components/QuestionCards.tsx`
Question cards display component for reports.

**Features:**
- Question card rendering
- Question information display
- Report actions

### `components/ScrollBarAlwaysVisible.tsx`
Always visible scrollbar component.

**Features:**
- Custom scrollbar styling
- Always visible scrollbar
- Theme-aware styling

## Data

### `data/approvedEvents.ts`
Approved events data for reporting.

**Features:**
- List of approved events
- Event validation
- Event metadata

## Utils

### `utils/parseQuestion.ts`
Question parsing utilities.

**Features:**
- Question data parsing
- Format conversion
- Data validation

## Important Notes

1. **Report Submission**: Users can submit reports on questions/content
2. **Report Management**: Admins can view and manage reports
3. **Pagination**: Supports paginated report listings
4. **Question Context**: Reports include question context
5. **Theme Support**: Dark/light mode support

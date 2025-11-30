# Plagiarism Directory

This directory contains the plagiarism detection system for the Scio.ly platform. Provides content similarity detection and analysis.

## Files

### `page.tsx`
Main plagiarism detection page component.

**Key Features:**
- Plagiarism detection interface
- Content analysis tools
- Similarity checking
- Detection results display

## Components

### `components/AnalysisList.tsx`
Plagiarism analysis results display component.

**Features:**
- Analysis results listing
- Similarity scores display
- Match details
- Result navigation

### `components/PlagiarismModal.tsx`
Plagiarism detection modal component.

**Features:**
- Detection interface
- Content input
- Detection controls
- Results display

### `components/QuestionItem.tsx`
Individual question item display for plagiarism analysis.

**Features:**
- Question rendering
- Similarity indicators
- Analysis controls
- Item navigation

### `components/SetupPanel.tsx`
Plagiarism detection setup panel.

**Features:**
- Detection configuration
- Parameter settings
- Detection options
- Setup validation

## Constants

### `constants.ts`
Plagiarism detection constants.

**Features:**
- Detection thresholds
- Similarity metrics
- Configuration options
- System parameters

## Types

### `types.ts`
TypeScript type definitions for plagiarism system.

**Features:**
- Plagiarism interfaces
- Component prop types
- Data structure definitions

## Utils

### `utils/fuzzyWorker.ts`
Fuzzy matching worker for similarity detection.

**Features:**
- Web worker for fuzzy matching
- Similarity calculations
- Performance optimization

### `utils/ui.ts`
UI utilities for plagiarism interface.

**Features:**
- UI helper functions
- Component utilities
- Display formatting

## Important Notes

1. **Similarity Detection**: Uses fuzzy matching algorithms
2. **Web Workers**: Uses web workers for performance
3. **Content Analysis**: Analyzes question content for similarity
4. **Threshold Configuration**: Configurable similarity thresholds
5. **Theme Support**: Dark/light mode support

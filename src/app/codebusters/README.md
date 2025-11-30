# Codebusters Directory

This directory contains the complete Codebusters event system for Science Olympiad. Provides comprehensive cipher practice, analysis tools, and educational resources.

## Files

### `page.tsx`
Main Codebusters practice page component.

**Key Features:**
- Cipher practice interface
- Question management
- Progress tracking
- Timer management
- Assignment support
- Print functionality
- Share functionality

**Example:**
```49:50:src/app/codebusters/page.tsx
export default function CodeBusters() {
  const { darkMode } = useTheme();
  // ... comprehensive state management and cipher practice logic
}
```

**Important Notes:**
- Uses multiple hooks for state management
- Supports all Codebusters cipher types
- Integrates with timer system
- Supports assignments and preview mode

### `CipherInfoModal.tsx`
Cipher information and help modal component.

**Features:**
- Cipher explanations
- Algorithm descriptions
- Example problems
- Educational content

### `cipher-utils.ts`
Cipher utility functions.

**Features:**
- Cipher processing utilities
- Cipher validation
- Cipher transformations

### `config.ts`
Codebusters configuration constants.

**Example:**
```1:13:src/app/codebusters/config.ts
import type { QuoteData } from "./types";

// Centralized disabled cipher list used by UI and generator
export const DISABLED_CIPHERS: QuoteData["cipherType"][] = [
  "K3 Patristocrat",
  "Random Patristocrat",
  "Random Xenocrypt",
  "K3 Xenocrypt",
];

export const filterEnabledCiphers = (
  ciphers: QuoteData["cipherType"][]
): QuoteData["cipherType"][] => ciphers.filter((c) => !DISABLED_CIPHERS.includes(c));
```

**Important Notes:**
- Defines disabled cipher types
- Used by UI and question generator

### `types.ts`
TypeScript type definitions for Codebusters system.

**Key Types:**
- `QuoteData` - Quote data interface with cipher information
- Cipher type definitions
- Solution interfaces

**Example:**
```10:44:src/app/codebusters/types.ts
export interface QuoteData {
  /** Unique identifier for the quote */
  id?: string;
  /** Author of the original quote */
  author: string;
  /** Original plaintext quote */
  quote: string;
  /** Encrypted version of the quote */
  encrypted: string;
  /** Type of cipher used for encryption */
  cipherType:
    | "Random Aristocrat"
    | "K1 Aristocrat"
    | "K2 Aristocrat"
    | "K3 Aristocrat"
    | "Random Patristocrat"
    | "K1 Patristocrat"
    | "K2 Patristocrat"
    | "K3 Patristocrat"
    | "Caesar"
    | "Atbash"
    | "Affine"
    | "Hill 2x2"
    | "Hill 3x3"
    | "Baconian"
    | "Porta"
    | "Nihilist"
    | "Fractionated Morse"
    | "Complete Columnar"
    | "Random Xenocrypt"
    | "K1 Xenocrypt"
    | "K2 Xenocrypt"
    | "K3 Xenocrypt"
    | "Checkerboard"
    | "Cryptarithm";
  // ... more fields
}
```

## Ciphers

### `ciphers/`
Cipher implementation directory containing all cipher algorithms.

**Cipher Files:**
- `affine.ts` - Affine cipher
- `atbash.ts` - Atbash cipher
- `caesar.ts` - Caesar cipher
- `porta.ts` - Porta cipher
- `random-substitutions.ts` - Random substitution ciphers
- `substitution-k-aristo.ts` - Aristocrat substitution
- `substitution-k-patri.ts` - Patristocrat substitution
- `substitution-k-xeno.ts` - Xenocrypt substitution

**Cipher Subdirectories:**
- `baconian/` - Baconian cipher implementation
- `checkerboard/` - Checkerboard cipher implementation
- `fractionatedMorse/` - Fractionated Morse cipher
- `hill/` - Hill cipher (2x2 and 3x3)
- `nihilist/` - Nihilist cipher
- `transposition/` - Transposition ciphers including cryptarithm

**Important Notes:**
- Each cipher has encryption/decryption functions
- Supports multiple cipher variants
- Includes utility functions for each cipher type

## Components

### `components/`
Main Codebusters components directory.

**Core Components:**
- `ActionButtons.tsx` - Action buttons for practice
- `CodebustersSummary.tsx` - Practice session summary
- `EmptyState.tsx` - Empty state display
- `Header.tsx` - Practice header
- `LoadingState.tsx` - Loading indicators
- `PDFModal.tsx` - PDF viewer modal
- `PrintConfigModal.tsx` - Print configuration
- `QuestionCard.tsx` - Individual question display
- `QuestionsList.tsx` - Questions list display
- `ShareButton.tsx` - Share functionality
- `SubmitButton.tsx` - Test submission button
- `VideoCarousel.tsx` - Video tutorial carousel

### `components/cipher-displays/`
Cipher-specific display components.

**Display Components:**
- `AristocratDisplay.tsx` - Aristocrat cipher display
- `BaconianDisplay.tsx` - Baconian cipher display
- `CheckerboardDisplay.tsx` - Checkerboard cipher display (with subcomponents)
- `ColumnarTranspositionDisplay.tsx` - Columnar transposition display
- `CryptarithmDisplay.tsx` - Cryptarithm display
- `FractionatedMorseDisplay.tsx` - Fractionated Morse display
- `FrequencyTable.tsx` - Frequency analysis table
- `HillDisplay.tsx` - Hill cipher display
- `NihilistDisplay.tsx` - Nihilist cipher display
- `PortaDisplay.tsx` - Porta cipher display
- `ReplacementTable.tsx` - Replacement table display
- `SubstitutionDisplay.tsx` - Substitution cipher display

**Important Notes:**
- Each cipher type has a specialized display component
- Components handle cipher-specific UI interactions
- Support for cipher solving interfaces

## Hooks

### `hooks/`
Custom hooks for Codebusters state management.

**Hooks:**
- `useAnswerChecking.ts` - Answer validation and checking
- `useAssignmentLoader.ts` - Assignment loading
- `useCodebustersState.ts` - Main state management hook
- `useHintSystem.ts` - Hint system management
- `useProgressCalculation.ts` - Progress calculation
- `useQuestionGeneration.ts` - Question generation
- `useSolutionHandlers.ts` - Solution handling
- `useTestReset.ts` - Test reset functionality
- `useTestSubmission.ts` - Test submission
- `useTimerManagement.ts` - Timer management

## Services

### `services/`
Service layer for Codebusters functionality.

**Services:**
- `questionLoader.ts` - Question loading service

**Utils:**
- `cipherMapping.ts` - Cipher type mapping
- `difficulty.ts` - Difficulty calculation
- `encryptionMapping.ts` - Encryption mapping
- `langGuards.ts` - Language guards
- `questionCreation.ts` - Question creation utilities
- `quoteLoading.ts` - Quote loading utilities

## Utils

### `utils/`
Utility functions for Codebusters.

**Grading Utils:**
- `grading/checkerboardGrading.ts` - Checkerboard grading
- `grading/cryptarithmGrading.ts` - Cryptarithm grading
- `grading/fractionatedMorseGrading.ts` - Fractionated Morse grading
- `grading/hillGrading.ts` - Hill cipher grading
- `grading/keywordGrading.ts` - Keyword grading
- `grading/otherCipherGrading.ts` - Other cipher grading
- `grading/pointsUtils.ts` - Points calculation utilities
- `grading/portaGrading.ts` - Porta grading
- `grading/substitutionGrading.ts` - Substitution grading

**Other Utils:**
- `baconianRevealer.ts` - Baconian revealer
- `cipherUtils.ts` - General cipher utilities
- `common.ts` - Common utilities
- `cryptarithmRevealer.ts` - Cryptarithm revealer
- `gradingUtils.ts` - General grading utilities
- `hillRevealer.ts` - Hill revealer
- `hintContentGenerators.ts` - Hint content generation
- `letterRevealers.ts` - Letter reveal utilities
- `plainLetterCalculators.ts` - Plain letter calculation
- `preview.ts` - Preview utilities
- `previewParams.ts` - Preview parameter utilities
- `printUtils.ts` - Print utilities
- `quoteCleaner.ts` - Quote cleaning utilities
- `substitution.ts` - Substitution utilities

**Print Utils:**
- `print/content.ts` - Print content generation
- `print/formatQuestions.ts` - Question formatting for print
- `print/setupWindow.ts` - Print window setup
- `print/styles.ts` - Print styles

## Schemes

### `schemes/`
Cipher scheme definitions and converters.

**Files:**
- `baconian-schemes.ts` - Baconian scheme definitions
- `display-renderer.ts` - Display rendering utilities
- `pattern-converter.ts` - Pattern conversion utilities

## Data

### `data/`
Static data for Codebusters.

**Files:**
- `cipherVideos.ts` - Video tutorial data

## Important Notes

1. **Cipher Support**: Supports 20+ cipher types
2. **Grading System**: Specialized grading for each cipher type
3. **Display Components**: Custom display components for each cipher
4. **Hint System**: Comprehensive hint system for learning
5. **Print Support**: Full print functionality for tests
6. **Video Tutorials**: Integrated video tutorial carousel
7. **Assignment Support**: Supports team assignments
8. **Timer Support**: Full timer integration
9. **Theme Support**: Dark/light mode support throughout

# Scio.ly Codebusters System Documentation

## Overview

The `src/app/codebusters/` directory contains the complete Codebusters event system for Science Olympiad. This system provides comprehensive cipher practice, analysis tools, and educational resources for the Codebusters event.

## Directory Structure

### Core Codebusters Components

#### `page.tsx`
- **Purpose**: Main Codebusters practice page
- **Features**:
  - Cipher practice interface
  - Question management
  - Progress tracking
  - Educational resources
- **Dependencies**: Codebusters components, cipher utilities
- **Props**: User authentication, practice settings
- **State Management**: Practice state, progress state

#### `CipherInfoModal.tsx`
- **Purpose**: Cipher information and help modal
- **Features**:
  - Cipher explanations
  - Algorithm descriptions
  - Example problems
  - Educational content
- **Dependencies**: Cipher utilities, educational content
- **Props**: Cipher type, modal state
- **State Management**: Modal state, content state

### Cipher Implementations (`ciphers/`)

#### Core Cipher Types
- **`affine.ts`**: Affine cipher implementation
- **`atbash.ts`**: Atbash cipher implementation
- **`caesar.ts`**: Caesar cipher implementation
- **`porta.ts`**: Porta cipher implementation
- **`random-substitutions.ts`**: Random substitution ciphers
- **`substitution-k-aristo.ts`**: Aristocrat substitution cipher
- **`substitution-k-patri.ts`**: Patriotic substitution cipher
- **`substitution-k-xeno.ts`**: Xenocrypt substitution cipher

### Cipher Display Components (`components/cipher-displays/`)

#### Display Components
- **`AristocratDisplay.tsx`**: Aristocrat cipher display
- **`BaconianDisplay.tsx`**: Baconian cipher display
- **`CheckerboardDisplay.tsx`**: Checkerboard cipher display
- **`ColumnarTranspositionDisplay.tsx`**: Columnar transposition display
- **`CryptarithmDisplay.tsx`**: Cryptarithm display
- **`FractionatedMorseDisplay.tsx`**: Fractionated Morse display
- **`FrequencyTable.tsx`**: Frequency analysis table
- **`HillDisplay.tsx`**: Hill cipher display
- **`NihilistDisplay.tsx`**: Nihilist cipher display
- **`PortaDisplay.tsx`**: Porta cipher display
- **`ReplacementTable.tsx`**: Replacement table display
- **`SubstitutionDisplay.tsx`**: Substitution cipher display

### Core Components (`components/`)

#### `CodebustersSummary.tsx`
- **Purpose**: Practice session summary component
- **Features**:
  - Session statistics
  - Performance metrics
  - Progress tracking
  - Achievement display
- **Dependencies**: Practice data, statistics
- **Props**: Session data, user progress
- **State Management**: Summary state, metrics state

#### `EmptyState.tsx`
- **Purpose**: Empty state component for no questions
- **Features**:
  - Empty state messaging
  - Action prompts
  - Helpful guidance
  - User onboarding
- **Dependencies**: User state, practice configuration
- **Props**: Empty state type, action handlers
- **State Management**: Empty state, user guidance

#### `FloatingButtons.tsx`
- **Purpose**: Floating action buttons
- **Features**:
  - Quick actions
  - Navigation shortcuts
  - Practice controls
  - User interface shortcuts
- **Dependencies**: Navigation, practice controls
- **Props**: Button configuration, action handlers
- **State Management**: Button state, action state

#### `Header.tsx`
- **Purpose**: Codebusters practice header
- **Features**:
  - Practice title
  - Progress indicators
  - Navigation controls
  - User information
- **Dependencies**: User authentication, practice state
- **Props**: Practice configuration, user data
- **State Management**: Header state, navigation state

#### `LoadingState.tsx`
- **Purpose**: Loading state component
- **Features**:
  - Loading indicators
  - Progress feedback
  - User guidance
  - Error handling
- **Dependencies**: Loading state, error handling
- **Props**: Loading type, error state
- **State Management**: Loading state, error state

#### `PDFModal.tsx`
- **Purpose**: PDF viewer modal
- **Features**:
  - PDF document viewing
  - Document navigation
  - Print functionality
  - Document sharing
- **Dependencies**: PDF viewer library
- **Props**: PDF document, modal state
- **State Management**: PDF state, modal state

#### `PrintConfigModal.tsx`
- **Purpose**: Print configuration modal
- **Features**:
  - Print settings
  - Layout options
  - Format configuration
  - Print preview
- **Dependencies**: Print utilities, layout system
- **Props**: Print configuration, modal state
- **State Management**: Print state, configuration state

#### `QuestionCard.tsx`
- **Purpose**: Individual question display component
- **Features**:
  - Question rendering
  - Answer input
  - Hint system
  - Progress tracking
- **Dependencies**: Question data, answer system
- **Props**: Question data, answer handlers
- **State Management**: Question state, answer state

#### `ShareButton.tsx`
- **Purpose**: Question sharing functionality
- **Features**:
  - Share question links
  - Social media sharing
  - Copy to clipboard
  - Share tracking
- **Dependencies**: Sharing utilities, social media APIs
- **Props**: Question data, share options
- **State Management**: Share state, tracking state

#### `SubmitButton.tsx`
- **Purpose**: Answer submission component
- **Features**:
  - Answer submission
  - Validation
  - Progress tracking
  - Feedback display
- **Dependencies**: Answer validation, submission system
- **Props**: Answer data, submission handlers
- **State Management**: Submission state, validation state

#### `VideoCarousel.tsx`
- **Purpose**: Educational video carousel
- **Features**:
  - Video playback
  - Video navigation
  - Educational content
  - Progress tracking
- **Dependencies**: Video player, educational content
- **Props**: Video data, navigation handlers
- **State Management**: Video state, navigation state

### Codebusters Hooks (`hooks/`)

#### `useAnswerChecking.ts`
- **Purpose**: Answer validation and checking
- **Features**:
  - Answer validation
  - Correctness checking
  - Feedback generation
  - Progress tracking
- **Dependencies**: Validation system, feedback generation
- **Returns**: Validation state, feedback data
- **Usage**: Answer checking and validation

#### `useCodebustersState.ts`
- **Purpose**: Codebusters practice state management
- **Features**:
  - Practice state management
  - Progress tracking
  - Session management
  - State persistence
- **Dependencies**: State management, persistence
- **Returns**: Practice state, state handlers
- **Usage**: Practice state management

#### `useHintSystem.ts`
- **Purpose**: Hint system management
- **Features**:
  - Hint generation
  - Hint display
  - Hint tracking
  - Educational guidance
- **Dependencies**: Hint generation, educational content
- **Returns**: Hint state, hint handlers
- **Usage**: Hint system implementation

#### `useProgressCalculation.ts`
- **Purpose**: Progress calculation and tracking
- **Features**:
  - Progress calculation
  - Performance metrics
  - Achievement tracking
  - Statistical analysis
- **Dependencies**: Progress algorithms, metrics calculation
- **Returns**: Progress data, metrics
- **Usage**: Progress tracking and analysis

#### `useSolutionHandlers.ts`
- **Purpose**: Solution handling and management
- **Features**:
  - Solution processing
  - Answer handling
  - Solution validation
  - Progress updates
- **Dependencies**: Solution processing, validation
- **Returns**: Solution handlers, validation state
- **Usage**: Solution management

### Codebusters Services (`services/`)

#### `questionLoader.ts`
- **Purpose**: Question loading and management
- **Features**:
  - Question fetching
  - Question caching
  - Question processing
  - Error handling
- **Dependencies**: Question API, caching system
- **Usage**: Question data management

### Codebusters Utilities (`utils/`)

#### Core Utilities
- **`common.ts`**: Common utility functions
- **`gradingUtils.ts`**: Grading and scoring utilities
- **`preview.ts`**: Question preview utilities
- **`previewParams.ts`**: Preview parameter handling
- **`printUtils.ts`**: Print functionality utilities
- **`quoteCleaner.ts`**: Text cleaning utilities
- **`substitution.ts`**: Substitution cipher utilities
- **`useOnlineStatus.ts`**: Online status management

### Codebusters Schemes (`schemes/`)

#### `baconian-schemes.ts`
- **Purpose**: Baconian cipher schemes
- **Features**:
  - Baconian cipher implementations
  - Scheme variations
  - Algorithm variations
  - Educational examples
- **Dependencies**: Baconian cipher algorithms
- **Usage**: Baconian cipher practice

#### `display-renderer.ts`
- **Purpose**: Cipher display rendering
- **Features**:
  - Cipher visualization
  - Display formatting
  - Rendering optimization
  - Visual enhancements
- **Dependencies**: Rendering system, display utilities
- **Usage**: Cipher display management

#### `pattern-converter.ts`
- **Purpose**: Pattern conversion utilities
- **Features**:
  - Pattern recognition
  - Pattern conversion
  - Pattern analysis
  - Pattern matching
- **Dependencies**: Pattern recognition algorithms
- **Usage**: Pattern processing

### Codebusters Data (`data/`)

#### `cipherVideos.ts`
- **Purpose**: Educational video data
- **Features**:
  - Video metadata
  - Educational content
  - Video organization
  - Content management
- **Dependencies**: Video content, educational resources
- **Usage**: Educational video management

## Codebusters System Architecture

### Cipher System
- **Cipher Types**: Multiple cipher implementations
- **Algorithm Support**: Various encryption algorithms
- **Educational Content**: Comprehensive learning resources
- **Practice System**: Interactive practice interface

### Educational Features
- **Video Content**: Educational video integration
- **Hint System**: Progressive hint system
- **Progress Tracking**: Comprehensive progress monitoring
- **Achievement System**: Progress and achievement tracking

### User Interface
- **Responsive Design**: Mobile and desktop optimization
- **Interactive Elements**: Dynamic user interactions
- **Accessibility**: WCAG compliance and accessibility
- **Performance**: Optimized rendering and interactions

## Key Features

### 1. Cipher Practice
- **Multiple Cipher Types**: Support for various cipher types
- **Interactive Practice**: Hands-on cipher practice
- **Real-time Feedback**: Immediate answer validation
- **Progress Tracking**: Comprehensive progress monitoring

### 2. Educational Resources
- **Video Content**: Educational video integration
- **Algorithm Explanations**: Detailed cipher explanations
- **Example Problems**: Practice problems and examples
- **Educational Guidance**: Step-by-step learning

### 3. Hint System
- **Progressive Hints**: Gradual hint revelation
- **Educational Guidance**: Learning-focused hints
- **Adaptive Difficulty**: Difficulty adjustment based on performance
- **Learning Support**: Educational hint content

### 4. Progress Tracking
- **Performance Metrics**: Detailed performance analysis
- **Achievement System**: Progress and achievement tracking
- **Statistical Analysis**: Performance statistics
- **Goal Setting**: Learning goal management

## Technical Implementation

### Cipher Algorithms
- **Mathematical Implementation**: Precise cipher algorithms
- **Performance Optimization**: Efficient cipher processing
- **Error Handling**: Robust error management
- **Validation**: Comprehensive input validation

### Educational Content
- **Content Management**: Educational content organization
- **Video Integration**: Video player integration
- **Interactive Elements**: Dynamic educational content
- **Progress Tracking**: Learning progress monitoring

### User Experience
- **Responsive Design**: Mobile and desktop optimization
- **Accessibility**: WCAG compliance and accessibility
- **Performance**: Optimized rendering and interactions
- **Error Handling**: Graceful error management

## Testing

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Cipher system integration testing
- **Algorithm Tests**: Cipher algorithm testing
- **User Experience Tests**: Practice interface usability

### Test Files
- **`CipherInfoModal.test.tsx`**: Modal component testing
- **Algorithm Tests**: Cipher algorithm testing
- **Component Tests**: Individual component testing
- **Integration Tests**: System integration testing

## Dependencies

### Core Dependencies
- **React**: Component framework
- **TypeScript**: Type safety
- **Cipher Libraries**: Cipher algorithm libraries
- **Video Player**: Video playback library

### Educational Dependencies
- **Educational Content**: Learning resource management
- **Video Content**: Video player integration
- **Progress Tracking**: Learning progress monitoring
- **Achievement System**: Progress and achievement tracking

## Usage Examples

### Cipher Practice
```typescript
import { useCodebustersState } from '@/app/codebusters/hooks/useCodebustersState';

function CodebustersPractice() {
  const { practiceState, startPractice, submitAnswer } = useCodebustersState();
  
  return (
    <div>
      <QuestionCard 
        question={practiceState.currentQuestion}
        onSubmit={submitAnswer}
      />
    </div>
  );
}
```

### Hint System
```typescript
import { useHintSystem } from '@/app/codebusters/hooks/useHintSystem';

function HintComponent() {
  const { hints, showHint, hintLevel } = useHintSystem();
  
  return (
    <div>
      <button onClick={showHint}>
        Show Hint ({hintLevel})
      </button>
      {hints.map(hint => (
        <div key={hint.id}>{hint.content}</div>
      ))}
    </div>
  );
}
```

### Progress Tracking
```typescript
import { useProgressCalculation } from '@/app/codebusters/hooks/useProgressCalculation';

function ProgressDisplay() {
  const { progress, metrics, achievements } = useProgressCalculation();
  
  return (
    <div>
      <div>Progress: {progress.percentage}%</div>
      <div>Correct: {metrics.correct}</div>
      <div>Achievements: {achievements.length}</div>
    </div>
  );
}
```

## Development Guidelines

### Component Structure
- **Single Responsibility**: Each component has a clear purpose
- **Composition**: Components composed of smaller components
- **Reusability**: Reusable cipher components
- **Maintainability**: Clear structure and documentation

### Cipher Implementation
- **Algorithm Accuracy**: Precise cipher algorithm implementation
- **Performance**: Efficient cipher processing
- **Error Handling**: Robust error management
- **Validation**: Comprehensive input validation

### Educational Content
- **Content Quality**: High-quality educational content
- **User Experience**: Intuitive learning interface
- **Progress Tracking**: Comprehensive progress monitoring
- **Achievement System**: Meaningful progress recognition

---

*This documentation provides a comprehensive overview of the Scio.ly Codebusters system and its functionality.*

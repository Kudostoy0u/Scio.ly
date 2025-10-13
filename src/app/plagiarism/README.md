# Scio.ly Plagiarism Detection System Documentation

## Overview

The `src/app/plagiarism/` directory contains the plagiarism detection system for the Scio.ly platform. This system provides comprehensive plagiarism detection, content analysis, and similarity checking for Science Olympiad questions and content.

## Directory Structure

### Core Plagiarism Components

#### `page.tsx`
- **Purpose**: Main plagiarism detection page
- **Features**:
  - Plagiarism detection interface
  - Content analysis tools
  - Similarity checking
  - Detection results
- **Dependencies**: Plagiarism components, detection services
- **Props**: User authentication, detection configuration
- **State Management**: Detection state, user state

### Plagiarism Components (`components/`)

#### `AnalysisList.tsx`
- **Purpose**: Plagiarism analysis results display
- **Features**:
  - Analysis results listing
  - Similarity scores
  - Match details
  - Result navigation
- **Dependencies**: Analysis system, results data
- **Props**: Analysis results, navigation handlers
- **State Management**: Analysis state, results state

#### `MatchSummary.tsx`
- **Purpose**: Plagiarism match summary
- **Features**:
  - Match summary display
  - Similarity metrics
  - Match details
  - Summary statistics
- **Dependencies**: Match system, summary data
- **Props**: Match data, summary configuration
- **State Management**: Match state, summary state

#### `PlagiarismModal.tsx`
- **Purpose**: Plagiarism detection modal
- **Features**:
  - Detection interface
  - Content input
  - Detection controls
  - Results display
- **Dependencies**: Detection system, modal management
- **Props**: Modal state, detection handlers
- **State Management**: Modal state, detection state

#### `QuestionItem.tsx`
- **Purpose**: Individual question item display for plagiarism analysis
- **Features**:
  - Question rendering
  - Similarity indicators
  - Analysis controls
  - Item navigation
- **Dependencies**: Question system, analysis tools
- **Props**: Question data, analysis handlers
- **State Management**: Question state, analysis state

#### `SetupPanel.tsx`
- **Purpose**: Plagiarism detection setup panel
- **Features**:
  - Detection configuration
  - Parameter settings
  - Detection options
  - Setup validation
- **Dependencies**: Configuration system, validation
- **Props**: Configuration options, validation handlers
- **State Management**: Configuration state, validation state

### Plagiarism Constants (`constants.ts`)
- **Purpose**: Plagiarism detection constants
- **Features**:
  - Detection thresholds
  - Similarity metrics
  - Configuration options
  - System parameters
- **Dependencies**: Plagiarism algorithms, configuration
- **Usage**: Plagiarism detection configuration

### Plagiarism Types (`types.ts`)
- **Purpose**: Plagiarism type definitions
- **Features**:
  - Plagiarism interfaces
  - Component prop types
  - Data structure definitions
  - Type safety for plagiarism components
- **Dependencies**: TypeScript type system
- **Usage**: Plagiarism type safety

### Plagiarism Utilities (`utils/`)

#### `fuzzyWorker.ts`
- **Purpose**: Fuzzy matching worker
- **Features**:
  - Fuzzy matching algorithms
  - Similarity calculations
  - Performance optimization
  - Worker management
- **Dependencies**: Fuzzy matching algorithms, worker system
- **Usage**: Fuzzy matching implementation

#### `ui.ts`
- **Purpose**: Plagiarism UI utilities
- **Features**:
  - UI helper functions
  - Display utilities
  - Interaction helpers
  - UI optimization
- **Dependencies**: UI system, interaction management
- **Usage**: Plagiarism UI management

## Plagiarism System Architecture

### Detection System
- **Content Analysis**: Comprehensive content analysis
- **Similarity Detection**: Advanced similarity algorithms
- **Fuzzy Matching**: Fuzzy matching implementation
- **Performance Optimization**: Efficient detection algorithms

### User Interface
- **Responsive Design**: Mobile and desktop optimization
- **Interactive Elements**: Dynamic user interactions
- **Accessibility**: WCAG compliance and accessibility
- **Performance**: Optimized rendering and interactions

### Content Management
- **Content Processing**: Content analysis and processing
- **Similarity Metrics**: Advanced similarity calculations
- **Detection Algorithms**: Multiple detection algorithms
- **Result Management**: Detection result management

## Key Features

### 1. Plagiarism Detection
- **Content Analysis**: Comprehensive content analysis
- **Similarity Detection**: Advanced similarity algorithms
- **Fuzzy Matching**: Fuzzy matching implementation
- **Performance Optimization**: Efficient detection algorithms

### 2. Content Analysis
- **Text Analysis**: Advanced text analysis
- **Similarity Metrics**: Comprehensive similarity calculations
- **Pattern Recognition**: Content pattern recognition
- **Statistical Analysis**: Content statistical analysis

### 3. User Interface
- **Responsive Design**: Mobile and desktop optimization
- **Interactive Elements**: Dynamic user interactions
- **Accessibility**: WCAG compliance and accessibility
- **Performance**: Optimized rendering and interactions

### 4. Result Management
- **Detection Results**: Comprehensive detection results
- **Similarity Scores**: Detailed similarity scoring
- **Match Details**: Detailed match information
- **Result Analysis**: Result analysis and reporting

## Technical Implementation

### Component Architecture
- **Layout Components**: Plagiarism layout management
- **Display Components**: Data visualization and display
- **Interactive Components**: User interaction and controls
- **State Components**: State management and coordination

### Data Flow
- **Data Fetching**: Efficient data retrieval
- **Data Processing**: Data transformation and processing
- **Data Display**: Visual data representation
- **User Interaction**: Interactive data manipulation

### Performance
- **Optimization**: Performance optimization techniques
- **Caching**: Strategic data caching
- **Lazy Loading**: Dynamic component loading
- **Memory Management**: Efficient memory usage

## Testing

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Plagiarism system integration testing
- **User Experience Tests**: Plagiarism interface usability testing
- **Performance Tests**: Plagiarism performance testing

### Test Files
- **`ui.test.ts`**: UI utility testing
- **Component Tests**: Individual component testing
- **Integration Tests**: Cross-component testing
- **Performance Tests**: Plagiarism performance testing

## Dependencies

### Core Dependencies
- **React**: Component framework
- **TypeScript**: Type safety
- **Next.js**: Framework integration
- **Tailwind CSS**: Styling framework

### Plagiarism Dependencies
- **Detection Algorithms**: Plagiarism detection algorithms
- **Content Analysis**: Content analysis libraries
- **Fuzzy Matching**: Fuzzy matching libraries
- **Worker System**: Web worker management

### UI Dependencies
- **React Icons**: Icon library
- **Framer Motion**: Animation library
- **React Hook Form**: Form management
- **React Query**: Data fetching and caching

## Usage Examples

### Plagiarism Detection
```typescript
import { PlagiarismModal } from '@/app/plagiarism/components/PlagiarismModal';

function PlagiarismDetection() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        Check for Plagiarism
      </button>
      <PlagiarismModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onDetect={handleDetection}
      />
    </div>
  );
}
```

### Analysis Results
```typescript
import { AnalysisList } from '@/app/plagiarism/components/AnalysisList';

function PlagiarismResults() {
  const [results, setResults] = useState([]);
  
  return (
    <AnalysisList
      results={results}
      onResultSelect={handleResultSelect}
      onViewDetails={handleViewDetails}
    />
  );
}
```

### Fuzzy Matching
```typescript
import { fuzzyWorker } from '@/app/plagiarism/utils/fuzzyWorker';

function FuzzyMatching() {
  const performFuzzyMatch = async (content1, content2) => {
    const worker = new fuzzyWorker();
    const similarity = await worker.calculateSimilarity(content1, content2);
    return similarity;
  };
  
  return (
    <div>
      {/* Fuzzy matching logic */}
    </div>
  );
}
```

## Development Guidelines

### Component Structure
- **Single Responsibility**: Each component has a clear purpose
- **Composition**: Components composed of smaller components
- **Reusability**: Reusable plagiarism components
- **Maintainability**: Clear structure and documentation

### Performance
- **Optimization**: Performance optimization techniques
- **Caching**: Strategic data caching
- **Lazy Loading**: Dynamic component loading
- **Memory Management**: Efficient memory usage

### User Experience
- **Responsive Design**: Mobile and desktop optimization
- **Accessibility**: WCAG compliance and accessibility
- **Performance**: Optimized rendering and interactions
- **Error Handling**: Graceful error management

---

*This documentation provides a comprehensive overview of the Scio.ly plagiarism detection system and its functionality.*

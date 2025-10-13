# Scio.ly Utilities Directory Documentation

## Overview

The `src/lib/utils/` directory contains utility functions and helper modules for the Scio.ly platform. These utilities provide common functionality across the application including encoding, grading, markdown processing, storage, and more.

## Directory Structure

### Core Utilities

#### `base52.ts`
- **Purpose**: Base52 encoding/decoding for question IDs
- **Features**: 
  - URL-safe encoding system
  - Question ID generation and lookup
  - Database integration for code mapping
  - Collision detection and resolution
- **Key Functions**:
  - `encodeBase52()`: Convert number to Base52 string
  - `decodeBase52()`: Convert Base52 string to number
  - `generateQuestionCode()`: Generate unique question codes
  - `getQuestionByCode()`: Retrieve questions by code
  - `generateQuestionCodes()`: Batch code generation
- **Dependencies**: Database connection, Drizzle ORM
- **Usage**: Question sharing and URL generation

#### `grade.ts`
- **Purpose**: Grading utilities and grade calculations
- **Features**:
  - Percentage to letter grade conversion
  - Grade calculation from earned/total points
  - Traditional US high school grading scale
  - Plus/minus grading support
- **Key Functions**:
  - `getLetterGradeFromPercentage()`: Convert percentage to letter grade
  - `percentageFromEarnedAndTotal()`: Calculate percentage from points
- **Usage**: Assessment grading and score display

#### `markdown.ts`
- **Purpose**: Markdown processing utilities
- **Features**:
  - LaTeX math normalization
  - Text slugification
  - Table of contents extraction
  - Markdown content processing
- **Key Functions**:
  - `normalizeMath()`: Normalize LaTeX math expressions
  - `slugifyText()`: Convert text to URL-friendly slugs
  - `extractToc()`: Extract table of contents from markdown
- **Dependencies**: github-slugger
- **Usage**: Content processing and navigation

### Storage & Data Utilities

#### `storage.ts`
- **Purpose**: Browser storage utilities
- **Features**:
  - LocalStorage and SessionStorage management
  - Data serialization and deserialization
  - Storage quota management
  - Cross-tab synchronization
- **Key Functions**:
  - Storage get/set/remove operations
  - Data validation and error handling
  - Storage cleanup and management
- **Usage**: Client-side data persistence

#### `string.ts`
- **Purpose**: String manipulation utilities
- **Features**:
  - Text processing and transformation
  - String validation and sanitization
  - Text formatting and normalization
  - Character encoding utilities
- **Key Functions**:
  - String validation and cleaning
  - Text formatting functions
  - Character encoding/decoding
- **Usage**: Text processing and validation

### Network & Communication

#### `network.ts`
- **Purpose**: Network utilities and HTTP operations
- **Features**:
  - HTTP request/response handling
  - Network error management
  - Request retry logic
  - API communication utilities
- **Key Functions**:
  - HTTP request helpers
  - Error handling and retry logic
  - Network status monitoring
- **Usage**: API communication and network operations

#### `supabaseRetry.ts`
- **Purpose**: Supabase retry logic and error handling
- **Features**:
  - Request retry mechanisms
  - Error handling for Supabase operations
  - Connection failure recovery
  - Rate limiting and backoff
- **Key Functions**:
  - Retry logic for failed requests
  - Error classification and handling
  - Connection recovery
- **Dependencies**: Supabase client
- **Usage**: Reliable Supabase operations

### Image & Media Utilities

#### `preloadImage.ts`
- **Purpose**: Image preloading and caching utilities
- **Features**:
  - Image preloading for performance
  - Image caching strategies
  - Lazy loading support
  - Image optimization
- **Key Functions**:
  - Image preloading functions
  - Cache management
  - Loading state handling
- **Usage**: Image performance optimization

### Team & User Utilities

#### `team-resolver.ts`
- **Purpose**: Team resolution and lookup utilities
- **Features**:
  - Team slug resolution
  - Team data lookup
  - Team validation
  - Team relationship resolution
- **Key Functions**:
  - Team slug to ID resolution
  - Team data retrieval
  - Team validation functions
- **Dependencies**: Team database, team services
- **Usage**: Team data access and validation

### Testing Utilities

#### Test Files
- **`base52.test.ts`**: Base52 encoding/decoding tests
- **`grade.test.ts`**: Grading utility tests
- **`markdown.test.ts`**: Markdown processing tests
- **`network.test.ts`**: Network utility tests
- **`storage.test.ts`**: Storage utility tests
- **`string.test.ts`**: String utility tests

## Utility Categories

### 1. Encoding & Cryptography
- **Base52 Encoding**: URL-safe encoding system
- **Hash Functions**: Data hashing and checksums
- **ID Generation**: Unique identifier generation
- **Code Mapping**: Database code mapping

### 2. Data Processing
- **Text Processing**: String manipulation and formatting
- **Markdown Processing**: Content processing and rendering
- **Math Processing**: LaTeX math normalization
- **Data Validation**: Input validation and sanitization

### 3. Storage Management
- **Browser Storage**: LocalStorage and SessionStorage
- **Data Persistence**: Client-side data storage
- **Cache Management**: Data caching strategies
- **Storage Optimization**: Storage quota management

### 4. Network Operations
- **HTTP Utilities**: Request/response handling
- **Error Handling**: Network error management
- **Retry Logic**: Request retry mechanisms
- **Connection Management**: Network connection handling

### 5. Assessment & Grading
- **Grade Calculation**: Score and grade calculations
- **Percentage Conversion**: Score percentage conversion
- **Letter Grades**: Grade letter conversion
- **Assessment Logic**: Grading algorithm implementation

## Technical Architecture

### Design Patterns
- **Utility Functions**: Pure functions with no side effects
- **Error Handling**: Comprehensive error management
- **Type Safety**: Full TypeScript type coverage
- **Testing**: Comprehensive test coverage

### Performance Optimization
- **Efficient Algorithms**: Optimized utility functions
- **Caching**: Strategic caching for expensive operations
- **Memory Management**: Efficient memory usage
- **Lazy Loading**: On-demand utility loading

### Error Handling
- **Input Validation**: Comprehensive input validation
- **Error Recovery**: Graceful error handling
- **Fallback Mechanisms**: Alternative approaches for failures
- **Logging**: Utility operation logging

## Usage Examples

### Base52 Encoding
```typescript
import { encodeBase52, decodeBase52, generateQuestionCode } from '@/lib/utils/base52';

// Encode a number to Base52
const encoded = encodeBase52(12345);
console.log(encoded); // "ABCd"

// Decode Base52 string to number
const decoded = decodeBase52("ABCd");
console.log(decoded); // 12345

// Generate unique question code
const code = await generateQuestionCode('question-uuid', 'questions');
console.log(code); // "ABCdS"
```

### Grading Utilities
```typescript
import { getLetterGradeFromPercentage, percentageFromEarnedAndTotal } from '@/lib/utils/grade';

// Convert percentage to letter grade
const grade = getLetterGradeFromPercentage(87.5);
console.log(grade); // "B+"

// Calculate percentage from points
const percentage = percentageFromEarnedAndTotal(85, 100);
console.log(percentage); // 85
```

### Markdown Processing
```typescript
import { normalizeMath, slugifyText, extractToc } from '@/lib/utils/markdown';

// Normalize LaTeX math
const normalized = normalizeMath("Inline: \\(x^2\\) and block: \\[\\sum_{i=1}^{n} i\\]");
console.log(normalized); // "Inline: $x^2$ and block: $$\\sum_{i=1}^{n} i$$"

// Create URL-friendly slug
const slug = slugifyText("Anatomy & Physiology");
console.log(slug); // "anatomy-physiology"

// Extract table of contents
const toc = extractToc("# Introduction\n## Getting Started");
console.log(toc); // [{ level: 1, text: "Introduction", id: "introduction" }, ...]
```

### Storage Management
```typescript
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/utils/storage';

// Store data in localStorage
await setStorageItem('user-preferences', { theme: 'dark', language: 'en' });

// Retrieve data from localStorage
const preferences = await getStorageItem('user-preferences');
console.log(preferences); // { theme: 'dark', language: 'en' }

// Remove data from localStorage
await removeStorageItem('user-preferences');
```

## Development Guidelines

### Code Standards
- **TypeScript**: Full type safety for all utilities
- **Documentation**: Comprehensive JSDoc comments
- **Testing**: Unit tests for all utility functions
- **Error Handling**: Robust error management

### Performance
- **Optimization**: Efficient algorithm implementation
- **Caching**: Strategic caching for expensive operations
- **Memory Usage**: Efficient memory management
- **Bundle Size**: Optimized utility bundle sizes

### Testing
- **Unit Tests**: Individual utility function testing
- **Integration Tests**: Cross-utility integration testing
- **Edge Cases**: Comprehensive edge case coverage
- **Performance Tests**: Utility performance testing

## Dependencies

### Core Dependencies
- **TypeScript**: Type safety and development
- **Node.js**: Runtime environment
- **Browser APIs**: Browser-specific functionality

### External Dependencies
- **github-slugger**: URL slug generation
- **Database Clients**: Database connection utilities
- **Storage APIs**: Browser storage APIs

### Development Dependencies
- **Testing Framework**: Utility testing
- **Mock Services**: External service mocking
- **Type Definitions**: TypeScript type definitions

---

*This documentation provides a comprehensive overview of the Scio.ly utilities and their functionality.*

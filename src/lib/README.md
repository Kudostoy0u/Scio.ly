# Scio.ly Library Directory Documentation

## Overview

The `src/lib/` directory contains the core business logic, utilities, and shared services for the Scio.ly platform. This directory is organized into several key areas: database management, API utilities, services, and utility functions.

## Directory Structure

### Database Management (`/db/`)

#### `index.ts`
- **Purpose**: Main database connection and configuration
- **Features**: Database connection pooling, configuration management
- **Dependencies**: PostgreSQL, Drizzle ORM

#### `schema.ts`
- **Purpose**: Database schema definitions using Drizzle ORM
- **Tables**:
  - `questions`: Main question bank with metadata
  - `quotes`: Short quotes for various purposes
  - `longquotes`: Longer quotes and content
  - `shareLinks`: Test sharing functionality
  - `edits`: Question edit tracking
  - `blacklists`: Content blacklisting system
  - `idEvents`: Event identification data
  - `base52Codes`: Base52 encoding for question IDs
- **Features**: Type-safe database operations, schema validation

#### `pool.ts`
- **Purpose**: Database connection pooling
- **Features**: Connection management, pool configuration
- **Dependencies**: PostgreSQL connection pooling

#### `teams.ts`
- **Purpose**: Team-related database operations
- **Features**: Team CRUD operations, member management
- **Dependencies**: CockroachDB for team data

#### `teamExtras.ts`
- **Purpose**: Extended team functionality
- **Features**: Team analytics, advanced team operations
- **Dependencies**: Team database operations

#### `notifications.ts`
- **Purpose**: Notification system database operations
- **Features**: Notification CRUD, user notifications
- **Dependencies**: Database notification storage

#### `utils.ts`
- **Purpose**: Database utility functions
- **Features**: Query helpers, database utilities
- **Dependencies**: Database connection utilities

### API Layer (`/api/`)

#### `auth.ts`
- **Purpose**: Authentication utilities and middleware
- **Features**: 
  - User authentication
  - Session management
  - Auth state validation
- **Dependencies**: Supabase Auth, JWT handling

#### `auth.test.ts`
- **Purpose**: Authentication testing
- **Features**: Auth flow testing, session testing
- **Dependencies**: Testing framework

#### `rateLimit.ts`
- **Purpose**: API rate limiting
- **Features**: Request throttling, abuse prevention
- **Dependencies**: Rate limiting middleware

#### `utils.ts`
- **Purpose**: API utility functions
- **Features**: Response formatting, error handling
- **Dependencies**: HTTP utilities

#### `__tests__/utils.test.ts`
- **Purpose**: API utilities testing
- **Features**: Utility function testing
- **Dependencies**: Testing framework

### Services (`/services/`)

#### `gemini.ts`
- **Purpose**: Google Gemini AI integration service
- **Features**:
  - Question explanation generation
  - Free response grading
  - Question analysis and improvement
  - Content validation
  - Image processing for questions
- **Key Methods**:
  - `explain()`: Generate question explanations
  - `gradeFreeResponses()`: Grade free response questions
  - `suggestEdit()`: Suggest question improvements
  - `validateEdit()`: Validate question edits
  - `analyzeQuestion()`: Analyze question quality
  - `extractQuestions()`: Extract questions from text
  - `improveReason()`: Improve user reasoning
- **Dependencies**: Google Gemini API, image processing

#### `teams.ts`
- **Purpose**: Team management service
- **Features**: Team operations, member management
- **Dependencies**: Database operations

#### `cockroachdb-teams.ts`
- **Purpose**: CockroachDB team operations
- **Features**: Advanced team functionality, team analytics
- **Dependencies**: CockroachDB connection

#### `team-data.ts`
- **Purpose**: Team data processing
- **Features**: Team data aggregation, analytics
- **Dependencies**: Team database operations

#### `roster-notifications.ts`
- **Purpose**: Team roster notification system
- **Features**: Roster change notifications, member updates
- **Dependencies**: Notification system

#### `__tests__/roster-notifications.test.ts`
- **Purpose**: Roster notification testing
- **Features**: Notification flow testing
- **Dependencies**: Testing framework

### Database Connections

#### `supabase.ts`
- **Purpose**: Supabase client configuration
- **Features**: 
  - Browser client setup
  - Authentication configuration
  - User profile management
- **Dependencies**: Supabase SSR, authentication

#### `supabaseServer.ts`
- **Purpose**: Server-side Supabase operations
- **Features**: Server-side authentication, user management
- **Dependencies**: Supabase server client

#### `cockroachdb.ts`
- **Purpose**: CockroachDB connection and operations
- **Features**: CockroachDB-specific operations, team data
- **Dependencies**: CockroachDB client

### Utility Functions (`/utils/`)

#### Core Utilities

#### `base52.ts`
- **Purpose**: Base52 encoding/decoding for question IDs
- **Features**: URL-safe encoding, ID generation
- **Dependencies**: Custom encoding algorithm

#### `base52.test.ts`
- **Purpose**: Base52 encoding testing
- **Features**: Encoding/decoding test cases
- **Dependencies**: Testing framework

#### `grade.ts`
- **Purpose**: Grading utilities and algorithms
- **Features**: Score calculation, grading logic
- **Dependencies**: Grading algorithms

#### `grade.test.ts`
- **Purpose**: Grading system testing
- **Features**: Grade calculation testing
- **Dependencies**: Testing framework

#### `logger.ts`
- **Purpose**: Logging utilities
- **Features**: Structured logging, log levels
- **Dependencies**: Logging framework

#### `markdown.ts`
- **Purpose**: Markdown processing utilities
- **Features**: Markdown parsing, rendering
- **Dependencies**: Markdown processing library

#### `markdown.test.ts`
- **Purpose**: Markdown processing testing
- **Features**: Markdown parsing tests
- **Dependencies**: Testing framework

#### `network.ts`
- **Purpose**: Network utilities
- **Features**: HTTP requests, network operations
- **Dependencies**: HTTP client

#### `network.test.ts`
- **Purpose**: Network utilities testing
- **Features**: Network operation testing
- **Dependencies**: Testing framework

#### `preloadImage.ts`
- **Purpose**: Image preloading utilities
- **Features**: Image caching, preloading
- **Dependencies**: Image processing

#### `storage.ts`
- **Purpose**: Local storage utilities
- **Features**: Browser storage, data persistence
- **Dependencies**: Browser storage APIs

#### `storage.test.ts`
- **Purpose**: Storage utilities testing
- **Features**: Storage operation testing
- **Dependencies**: Testing framework

#### `string.ts`
- **Purpose**: String manipulation utilities
- **Features**: Text processing, string operations
- **Dependencies**: String processing

#### `string.test.ts`
- **Purpose**: String utilities testing
- **Features**: String operation testing
- **Dependencies**: Testing framework

#### `supabaseRetry.ts`
- **Purpose**: Supabase retry logic
- **Features**: Request retry, error handling
- **Dependencies**: Supabase client

#### `team-resolver.ts`
- **Purpose**: Team resolution utilities
- **Features**: Team lookup, team resolution
- **Dependencies**: Team database operations

### Hooks (`/hooks/`)

#### `useInfiniteScroll.ts`
- **Purpose**: Infinite scroll hook
- **Features**: Scroll-based loading, pagination
- **Dependencies**: React hooks, scroll events

### Type Definitions (`/types/`)

#### `api.ts`
- **Purpose**: API type definitions
- **Features**: API request/response types, endpoint types
- **Dependencies**: TypeScript types

#### `database.ts`
- **Purpose**: Database type definitions
- **Features**: Database schema types, table types
- **Dependencies**: Database schema types

## Key Features

### 1. Database Management
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Efficient database connections
- **Schema Management**: Database schema definitions
- **Multi-Database Support**: Supabase + CockroachDB

### 2. AI Integration
- **Google Gemini 2.0**: Advanced AI capabilities
- **Question Analysis**: AI-powered question improvement
- **Explanation Generation**: Automated explanations
- **Free Response Grading**: AI grading system
- **Image Processing**: Visual question support

### 3. Authentication System
- **Supabase Auth**: User authentication
- **Session Management**: Secure session handling
- **Profile Sync**: User profile synchronization
- **OAuth Integration**: Google OAuth support

### 4. Team Management
- **Team Operations**: Team CRUD operations
- **Member Management**: Team member operations
- **Notifications**: Team notification system
- **Analytics**: Team performance tracking

### 5. Utility Functions
- **Base52 Encoding**: URL-safe ID encoding
- **Grading System**: Score calculation algorithms
- **Markdown Processing**: Content rendering
- **Storage Management**: Data persistence
- **Network Operations**: HTTP utilities

## Technical Architecture

### Database Layer
- **Primary Database**: Supabase (PostgreSQL)
- **Secondary Database**: CockroachDB (Teams)
- **ORM**: Drizzle ORM for type safety
- **Connection Pooling**: Efficient connection management

### AI Integration
- **Provider**: Google Gemini 2.0
- **Features**: Question analysis, explanations, grading
- **Image Support**: Visual question processing
- **Streaming**: Real-time AI responses

### Authentication
- **Provider**: Supabase Auth
- **Features**: OAuth, session management
- **Security**: JWT tokens, secure sessions
- **Profile Sync**: Automatic profile synchronization

### Utilities
- **Type Safety**: Full TypeScript support
- **Testing**: Comprehensive test coverage
- **Error Handling**: Robust error management
- **Performance**: Optimized operations

## Development Guidelines

### Code Organization
- **Service Layer**: Business logic separation
- **Utility Functions**: Reusable utilities
- **Type Safety**: Full TypeScript coverage
- **Testing**: Comprehensive test coverage

### Database Operations
- **Type Safety**: Drizzle ORM for type safety
- **Connection Management**: Efficient pooling
- **Error Handling**: Robust error management
- **Performance**: Optimized queries

### AI Integration
- **Structured Responses**: JSON schema validation
- **Error Handling**: Graceful AI failures
- **Performance**: Efficient AI operations
- **Image Support**: Visual content processing

### Testing
- **Unit Tests**: Individual function testing
- **Integration Tests**: Service integration testing
- **Mocking**: External service mocking
- **Coverage**: Comprehensive test coverage

## Dependencies

### Core Dependencies
- **Drizzle ORM**: Database operations
- **Supabase**: Authentication and database
- **Google Gemini**: AI integration
- **TypeScript**: Type safety

### Utility Dependencies
- **React Hooks**: Custom hooks
- **HTTP Clients**: Network operations
- **Storage APIs**: Data persistence
- **Testing Frameworks**: Test utilities

---

*This documentation provides a comprehensive overview of the Scio.ly library structure and functionality.*

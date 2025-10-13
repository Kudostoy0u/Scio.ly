# Scio.ly API Routes Documentation

## Overview

The `src/app/api/` directory contains all Next.js API routes for the Scio.ly platform. These routes handle backend functionality including authentication, question management, team operations, AI integration, and more.

## Directory Structure

### Core API Routes

#### `/admin/`
- **Purpose**: Administrative API endpoints
- **Files**: `route.ts`
- **Features**: System administration, admin operations
- **Authentication**: Admin-level access required

#### `/assignments/`
- **Purpose**: Assignment management system
- **Files**: `route.ts`, `submit/route.ts`
- **Features**: Assignment CRUD, submission handling
- **Dependencies**: Team system, user authentication

#### `/blacklists/`
- **Purpose**: Content blacklisting system
- **Files**: `route.ts`
- **Features**: Blacklist management, content filtering
- **Usage**: Content moderation and quality control

#### `/codebusters/`
- **Purpose**: Codebusters event-specific API
- **Files**: `share/generate/route.ts`, `share/route.ts`
- **Features**: Cipher processing, pattern analysis, sharing
- **Dependencies**: Codebusters cipher system

#### `/contact/`
- **Purpose**: Contact form API
- **Files**: `route.ts`
- **Features**: Contact form processing, email notifications
- **Dependencies**: Email service integration

#### `/docs/`
- **Purpose**: Documentation API
- **Files**: `route.ts`, `codebusters/[cipher]/route.ts`
- **Features**: Content management, documentation serving
- **Dependencies**: Markdown processing, content storage

#### `/edits/`
- **Purpose**: Content editing API
- **Files**: `route.ts`
- **Features**: Content modification, version control
- **Dependencies**: Question management system

### AI Integration Routes (`/gemini/`)

#### `/analyze-question/`
- **Purpose**: AI-powered question analysis
- **Files**: `route.ts`, `__tests__/route.test.ts`
- **Features**: Question quality analysis, content validation
- **AI Model**: Google Gemini 2.0
- **Dependencies**: Gemini service integration

#### `/explain/`
- **Purpose**: AI explanation generation
- **Files**: `route.ts`
- **Features**: Question explanation generation
- **AI Model**: Google Gemini 2.0
- **Usage**: Student learning support

#### `/extract-questions/`
- **Purpose**: Question extraction from text
- **Files**: `route.ts`
- **Features**: Automated question extraction
- **AI Model**: Google Gemini 2.0
- **Usage**: Content processing and import

#### `/grade-free-responses/`
- **Purpose**: AI grading of free response questions
- **Files**: `route.ts`
- **Features**: Automated grading and feedback
- **AI Model**: Google Gemini 2.0
- **Usage**: Assessment automation

#### `/improve-reason/`
- **Purpose**: AI improvement of user reasoning
- **Files**: `route.ts`
- **Features**: Reasoning enhancement suggestions
- **AI Model**: Google Gemini 2.0
- **Usage**: Content improvement

#### `/suggest-edit/`
- **Purpose**: AI-powered edit suggestions
- **Files**: `route.ts`
- **Features**: Content improvement suggestions
- **AI Model**: Google Gemini 2.0
- **Usage**: Content quality enhancement

#### `/validate-edit/`
- **Purpose**: AI validation of content edits
- **Files**: `route.ts`
- **Features**: Edit validation and approval
- **AI Model**: Google Gemini 2.0
- **Usage**: Content quality control

### System Routes

#### `/health/`
- **Purpose**: System health monitoring
- **Files**: `route.ts`, `__tests__/route.test.ts`
- **Features**: Health checks, service status monitoring
- **Dependencies**: Database, AI services
- **Usage**: System monitoring and diagnostics

#### `/id-questions/`
- **Purpose**: Question identification API
- **Files**: `route.ts`
- **Features**: Question metadata, identification
- **Dependencies**: Question database

#### `/join/`
- **Purpose**: User registration API
- **Files**: `route.ts`
- **Features**: User onboarding, account creation
- **Dependencies**: Authentication system

### Team Management Routes (`/teams/`)

#### `/by-code/`
- **Purpose**: Team lookup by code
- **Files**: `route.ts`
- **Features**: Team code validation, team retrieval
- **Dependencies**: Team database

#### `/calendar/`
- **Purpose**: Team calendar management
- **Files**: `events/route.ts`, `events/[eventId]/route.ts`, `personal/route.ts`, `recurring-meetings/route.ts`
- **Features**: Event management, scheduling, recurring meetings
- **Dependencies**: Team system, calendar integration
- **Tests**: Comprehensive test suite for calendar functionality

#### `/create/`
- **Purpose**: Team creation API
- **Files**: Multiple route files
- **Features**: Team creation, validation, setup
- **Dependencies**: Team database, user authentication

#### `/group/`
- **Purpose**: Team grouping system
- **Files**: `[slug]/route.ts`
- **Features**: Team group management, slug-based routing
- **Dependencies**: Team database, slug system

#### `/invite/`
- **Purpose**: Team invitation system
- **Files**: `route.ts`
- **Features**: Team invitation management
- **Dependencies**: Team system, notification system

#### `/join-by-code/`
- **Purpose**: Join team by code
- **Files**: `route.ts`
- **Features**: Team joining via code
- **Dependencies**: Team system, code validation

#### `/link-request/`
- **Purpose**: Team linking requests
- **Files**: `route.ts`
- **Features**: Team linking, request management
- **Dependencies**: Team system, notification system

#### `/links/`
- **Purpose**: Team links management
- **Files**: `route.ts`
- **Features**: Team link generation, management
- **Dependencies**: Team system, link generation

#### `/share/`
- **Purpose**: Team sharing functionality
- **Files**: `route.ts`
- **Features**: Team content sharing
- **Dependencies**: Team system, sharing system

#### `/units/`
- **Purpose**: Team units management
- **Files**: `route.ts`, `[slug]/route.ts`
- **Features**: Team unit operations, slug-based routing
- **Dependencies**: Team system, unit management

#### `/unlink/`
- **Purpose**: Team unlinking
- **Files**: `route.ts`
- **Features**: Team relationship removal
- **Dependencies**: Team system

#### `/user-teams/`
- **Purpose**: User team management
- **Files**: Multiple route files
- **Features**: User team operations, membership management
- **Dependencies**: Team system, user authentication

### Team V2 API (`/teams/v2/`)

#### Core Team Operations
- **`create/`**: Team creation with enhanced features
- **`join/`**: Team joining with validation
- **`user-teams/`**: User team management
- **`archived/`**: Archived team management
- **`health/`**: Team system health checks
- **`notifications/`**: Team notification system
- **`roster-notifications/`**: Roster-specific notifications

#### Team-Specific Operations (`/[teamId]/`)
- **`archive/`**: Team archiving functionality
- **`assignments/`**: Team assignment management
  - **`enhanced/`**: Enhanced assignment features
  - **`generate-questions/`**: Question generation for assignments
  - **`[assignmentId]/submit/`**: Assignment submission
- **`codes/`**: Team code management
- **`events/`**: Team event management
- **`exit/`**: Team exit functionality
- **`invite/`**: Team invitation management
- **`materials/`**: Team material management
- **`members/`**: Team member management
- **`posts/`**: Team post management
- **`roster/`**: Team roster management
  - **`invite/`**: Roster invitation system
  - **`link-status/`**: Roster linking status
- **`subteams/`**: Subteam management

### Question Management Routes (`/questions/`)

#### `/base52/`
- **Purpose**: Base52 encoding for questions
- **Files**: `route.ts`
- **Features**: Question ID encoding, URL generation
- **Dependencies**: Base52 utility system

#### `/batch/`
- **Purpose**: Batch question operations
- **Files**: `route.ts`
- **Features**: Bulk question processing
- **Dependencies**: Question database

#### Main Route
- **Files**: `route.ts`
- **Features**: Question CRUD operations
- **Dependencies**: Question database, AI services

### Reporting Routes (`/report/`)

#### `/all/`
- **Purpose**: Report listing
- **Files**: `route.ts`
- **Features**: Report management, listing
- **Dependencies**: Report system

#### `/edit/`
- **Purpose**: Report editing
- **Files**: `route.ts`, `__tests__/route.test.ts`
- **Features**: Report modification, validation
- **Dependencies**: Report system, content validation

#### `/meta/`
- **Purpose**: Report metadata
- **Files**: `route.ts`
- **Features**: Report metadata management
- **Dependencies**: Report system

#### `/remove/`
- **Purpose**: Report removal
- **Files**: `route.ts`, `__tests__/route.test.ts`
- **Features**: Report deletion, cleanup
- **Dependencies**: Report system

### Sharing Routes (`/share/`)

#### `/generate/`
- **Purpose**: Share code generation
- **Files**: `route.ts`
- **Features**: Share code creation, validation
- **Dependencies**: Sharing system

#### Main Route
- **Files**: `route.ts`
- **Features**: Content sharing, share management
- **Dependencies**: Sharing system, content storage

### Utility Routes

#### `/meta/`
- **Purpose**: Metadata API endpoints
- **Files**: `events/route.ts`, `stats/route.ts`, `subtopics/route.ts`, `tournaments/route.ts`
- **Features**: System metadata, statistics
- **Dependencies**: Database, analytics system

#### `/notifications/`
- **Purpose**: Notification system
- **Files**: `route.ts`, `accept/route.ts`
- **Features**: Notification management, real-time updates
- **Dependencies**: Notification system, real-time services

#### `/quotes/`
- **Purpose**: Quote management API
- **Files**: `route.ts`
- **Features**: Quote CRUD, content management
- **Dependencies**: Quote database

#### `/upload-image/`
- **Purpose**: Image upload API
- **Files**: `route.ts`
- **Features**: Image processing, storage management
- **Dependencies**: File storage, image processing

## Key Features

### 1. RESTful API Design
- **HTTP Methods**: GET, POST, PUT, DELETE support
- **Status Codes**: Proper HTTP status code usage
- **Error Handling**: Comprehensive error responses
- **Validation**: Input validation and sanitization

### 2. Authentication & Authorization
- **User Authentication**: Supabase Auth integration
- **Role-Based Access**: Admin, team captain, member roles
- **API Security**: Rate limiting, input validation
- **Session Management**: Secure session handling

### 3. AI Integration
- **Gemini 2.0**: Advanced AI capabilities
- **Question Analysis**: AI-powered question quality assessment
- **Explanation Generation**: Automated explanations
- **Content Processing**: AI content enhancement

### 4. Team Management
- **Team Operations**: CRUD operations for teams
- **Member Management**: Team membership handling
- **Collaboration**: Team sharing and collaboration
- **Notifications**: Real-time team notifications

### 5. Question System
- **Question Bank**: 4000+ Science Olympiad questions
- **Base52 Encoding**: URL-safe question identifiers
- **AI Processing**: AI-powered question analysis
- **Content Management**: Question editing and validation

### 6. Real-time Features
- **Notifications**: Real-time notification system
- **Team Updates**: Live team updates
- **Collaboration**: Real-time collaboration features
- **Status Updates**: Live status monitoring

## Technical Architecture

### API Design Patterns
- **Route Handlers**: Next.js App Router API routes
- **Middleware**: Authentication and validation middleware
- **Error Handling**: Centralized error handling
- **Response Formatting**: Consistent response formats

### Database Integration
- **Supabase**: Primary database for users and questions
- **CockroachDB**: Secondary database for teams
- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: Efficient database connections

### AI Integration
- **Google Gemini**: AI service integration
- **Structured Responses**: JSON schema validation
- **Error Handling**: Graceful AI failures
- **Performance**: Efficient AI operations

### Testing
- **Unit Tests**: Individual route testing
- **Integration Tests**: API integration testing
- **Mock Services**: External service mocking
- **Coverage**: Comprehensive test coverage

## Development Guidelines

### Route Organization
- **Logical Grouping**: Related routes grouped together
- **Nested Routes**: Hierarchical route structure
- **Dynamic Routes**: Parameter-based routing
- **File Naming**: Consistent naming conventions

### Error Handling
- **HTTP Status Codes**: Proper status code usage
- **Error Messages**: Clear error messages
- **Logging**: Comprehensive request logging
- **Validation**: Input validation and sanitization

### Security
- **Authentication**: Secure authentication
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive input validation
- **Rate Limiting**: API rate limiting

### Performance
- **Caching**: Response caching strategies
- **Database Optimization**: Efficient database queries
- **AI Optimization**: Efficient AI operations
- **Response Time**: Optimized response times

## Dependencies

### Core Dependencies
- **Next.js**: API route framework
- **TypeScript**: Type safety
- **Supabase**: Authentication and database
- **CockroachDB**: Team database

### AI Dependencies
- **Google Gemini**: AI service integration
- **AI Processing**: Content analysis and generation
- **Schema Validation**: Response validation

### Testing Dependencies
- **Vitest**: Testing framework
- **Testing Library**: API testing utilities
- **Mock Services**: External service mocking

---

*This documentation provides a comprehensive overview of the Scio.ly API routes and their functionality.*

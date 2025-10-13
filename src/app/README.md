# Scio.ly App Directory Documentation

## Overview

The `src/app/` directory contains the main Next.js 15 App Router application structure. This directory follows Next.js conventions with route-based file organization, API routes, and component architecture.

## Directory Structure

### Core Application Files

#### `layout.tsx`
- **Purpose**: Root layout component for the entire application
- **Features**: 
  - Metadata configuration for SEO
  - Theme provider setup
  - Authentication context
  - Google Analytics integration
  - PWA manifest and icons
- **Key Dependencies**: Next.js, Supabase Auth, Theme Context

#### `page.tsx`
- **Purpose**: Homepage route handler
- **Features**: Dynamic rendering for home page content
- **Dependencies**: HomeClient component

#### `providers.tsx`
- **Purpose**: Client-side providers wrapper
- **Features**:
  - Toast notifications setup
  - Service worker registration
  - Theme-aware toast styling
  - Notifications context

#### `globals.css`
- **Purpose**: Global CSS styles and Tailwind imports
- **Features**: Base styling, custom CSS variables, responsive design

### Page Routes

#### `/about/`
- **Purpose**: About page for the platform
- **Files**: `ClientPage.tsx`, `page.tsx`
- **Features**: Company information, team details

#### `/admin/`
- **Purpose**: Administrative interface
- **Files**: `page.tsx`, `PasswordAuth.tsx`
- **Features**: Admin authentication, system management

#### `/analytics/`
- **Purpose**: User analytics and performance tracking
- **Features**:
  - ELO rating system visualization
  - Performance charts and metrics
  - Data processing utilities
- **Components**: ChartConfig, EloViewer, CompareTool
- **Hooks**: useEloData

#### `/bookmarks/`
- **Purpose**: User bookmarked questions management
- **Files**: `Content.tsx`, `page.tsx`
- **Features**: Bookmark CRUD operations, user favorites

#### `/codebusters/`
- **Purpose**: Codebusters event practice platform
- **Features**:
  - Cipher encryption/decryption tools
  - Multiple cipher types support
  - Interactive cipher practice
  - Video tutorials integration
- **Components**: 25+ specialized cipher components
- **Services**: Cipher processing, pattern recognition
- **Utils**: Cipher utilities, pattern converters

#### `/contact/`
- **Purpose**: Contact form and support
- **Files**: `ClientPage.tsx`, `page.tsx`
- **Features**: Contact form, support requests

#### `/dashboard/`
- **Purpose**: User dashboard and analytics
- **Features**:
  - User performance metrics
  - Recent activity
  - Progress tracking
  - Quick access to features
- **Components**: 11 dashboard-specific components
- **Hooks**: Custom dashboard hooks
- **Context**: Dashboard state management

#### `/docs/`
- **Purpose**: Documentation system for Science Olympiad events
- **Features**:
  - Event-specific documentation
  - API documentation
  - Content management system
- **Content**: 71 markdown files with event rules
- **Components**: Documentation renderers, navigation

#### `/join/`
- **Purpose**: User registration and onboarding
- **Files**: `ClientPage.tsx`, `page.tsx`
- **Features**: User registration flow

#### `/leaderboard/`
- **Purpose**: Team and individual leaderboards
- **Features**:
  - Team rankings
  - Individual performance
  - Competition tracking
- **Dynamic Routes**: `[code]/` for specific leaderboards

#### `/legal/`
- **Purpose**: Legal pages
- **Subdirectories**: `privacy/`, `terms/`
- **Features**: Privacy policy, terms of service

#### `/offline/`
- **Purpose**: Offline functionality page
- **Features**: PWA offline capabilities

#### `/plagiarism/`
- **Purpose**: Plagiarism detection and reporting
- **Features**:
  - Content similarity detection
  - Reporting system
  - Moderation tools
- **Components**: 5 plagiarism-specific components
- **Utils**: Similarity algorithms, content analysis

#### `/practice/`
- **Purpose**: Practice mode interface
- **Features**:
  - Question practice sessions
  - Difficulty selection
  - Progress tracking
- **Components**: 15 practice-specific components
- **Utils**: Practice session management

#### `/profile/`
- **Purpose**: User profile management
- **Features**: User settings, preferences, account management

#### `/reports/`
- **Purpose**: Reporting system for issues and feedback
- **Features**:
  - Issue reporting
  - Content moderation
  - Feedback collection
- **Components**: 4 reporting components
- **Utils**: Report processing, moderation tools

#### `/teams/`
- **Purpose**: Team management and collaboration
- **Features**:
  - Team creation and management
  - Member invitations
  - Team assignments
  - Collaboration tools
- **Components**: 24 team-specific components
- **Dynamic Routes**: `[slug]/` for team pages
- **Subdirectories**: `assign/`, `invites/`, `teams-dashboard/`

#### `/test/`
- **Purpose**: Test taking interface
- **Features**:
  - Timed test sessions
  - Question navigation
  - Answer submission
  - Results processing
- **Components**: 8 test-specific components
- **Hooks**: 15 test-related hooks
- **Services**: Test session management

#### `/unlimited/`
- **Purpose**: Unlimited practice mode
- **Features**:
  - Endless practice sessions
  - Custom difficulty
  - Progress tracking
- **Components**: 2 unlimited practice components
- **Utils**: 9 practice utilities

### API Routes (`/api/`)

#### `/admin/`
- **Purpose**: Administrative API endpoints
- **Features**: System management, admin operations

#### `/assignments/`
- **Purpose**: Assignment management
- **Features**: Assignment CRUD, submission handling
- **Subdirectories**: `submit/` for assignment submissions

#### `/blacklists/`
- **Purpose**: Content blacklisting system
- **Features**: Blacklist management, content filtering

#### `/codebusters/`
- **Purpose**: Codebusters-specific API
- **Features**: Cipher processing, pattern analysis
- **Subdirectories**: `share/` for sharing ciphers

#### `/contact/`
- **Purpose**: Contact form API
- **Features**: Contact form processing, email notifications

#### `/docs/`
- **Purpose**: Documentation API
- **Features**: Content management, documentation serving
- **Subdirectories**: `codebusters/` for cipher documentation

#### `/edits/`
- **Purpose**: Content editing API
- **Features**: Content modification, version control

#### `/gemini/`
- **Purpose**: AI integration with Google Gemini
- **Features**:
  - Question analysis
  - Explanation generation
  - Free response grading
  - Content improvement suggestions
- **Subdirectories**: 
  - `analyze-question/` - Question analysis
  - `explain/` - Explanation generation
  - `extract-questions/` - Question extraction
  - `grade-free-responses/` - FRQ grading
  - `improve-reason/` - Reasoning improvement
  - `suggest-edit/` - Edit suggestions
  - `validate-edit/` - Edit validation

#### `/health/`
- **Purpose**: System health monitoring
- **Features**: Health checks, service status monitoring
- **Tests**: Health check test suite

#### `/id-questions/`
- **Purpose**: Question identification API
- **Features**: Question metadata, identification

#### `/invites/`
- **Purpose**: Team invitation system
- **Features**: Invitation management, acceptance/decline
- **Subdirectories**: `accept/`, `create/`, `decline/`, `my/`

#### `/join/`
- **Purpose**: User registration API
- **Features**: User onboarding, account creation

#### `/meta/`
- **Purpose**: Metadata API endpoints
- **Features**: System metadata, statistics
- **Subdirectories**: `events/`, `stats/`, `subtopics/`, `tournaments/`

#### `/notifications/`
- **Purpose**: Notification system
- **Features**: Notification management, real-time updates
- **Subdirectories**: `accept/` for notification acceptance

#### `/questions/`
- **Purpose**: Question management API
- **Features**: Question CRUD, batch operations
- **Subdirectories**: `base52/`, `batch/`
- **Tests**: Question API test suite

#### `/quotes/`
- **Purpose**: Quote management API
- **Features**: Quote CRUD, content management

#### `/report/`
- **Purpose**: Reporting system API
- **Features**: Report processing, moderation
- **Subdirectories**: `all/`, `edit/`, `meta/`, `remove/`

#### `/share/`
- **Purpose**: Content sharing API
- **Features**: Share code generation, content sharing
- **Subdirectories**: `generate/` for share code generation

#### `/teams/`
- **Purpose**: Team management API
- **Features**: Team CRUD, member management, collaboration
- **Subdirectories**: 
  - `by-code/` - Team lookup by code
  - `create/` - Team creation
  - `group/` - Team grouping
  - `invite/` - Team invitations
  - `join-by-code/` - Join team by code
  - `link-request/` - Team linking requests
  - `links/` - Team links
  - `share/` - Team sharing
  - `units/` - Team units
  - `unlink/` - Team unlinking
  - `user-teams/` - User team management
  - `v2/` - Version 2 team API (40 files)

#### `/upload-image/`
- **Purpose**: Image upload API
- **Features**: Image processing, storage management

### Components (`/components/`)

#### Authentication Components
- **AuthButton**: Main authentication button component
- **Auth Components**: Login, signup, password reset components

#### Core Components
- **Header**: Main navigation header with responsive design
- **BookmarkManager**: Bookmark management interface
- **ContactModal**: Contact form modal
- **EditQuestionModal**: Question editing interface
- **FloatingActionButtons**: Floating action buttons
- **LoadingState**: Loading state components
- **PDFViewer**: PDF viewing component
- **PrintConfigModal**: Print configuration modal
- **ProfileSettings**: User profile settings
- **QuestionActions**: Question action buttons
- **ReportModal**: Reporting modal
- **ShareModal**: Content sharing modal
- **SummaryGrid**: Summary grid display
- **ThemeColorMeta**: Theme color metadata
- **ThemeSection**: Theme section component

#### Home Components
- **HomeClient**: Homepage client component

### Contexts (`/contexts/`)

#### AuthContext
- **Purpose**: Authentication state management
- **Features**: User session, authentication state, profile sync

#### NotificationsContext
- **Purpose**: Notification state management
- **Features**: Real-time notifications, notification management

#### ThemeContext
- **Purpose**: Theme state management
- **Features**: Dark/light mode, theme persistence

### Utilities (`/utils/`)

#### Core Utilities
- **bookmarks.ts**: Bookmark management utilities
- **careersUtils.ts**: Career-related utilities
- **contactUtils.ts**: Contact form utilities
- **dashboardData.ts**: Dashboard data processing
- **db.ts**: Database utilities
- **favorites.ts**: Favorites management
- **gamepoints.ts**: Game points system
- **geminiService.ts**: AI service integration
- **leaderboardUtils.ts**: Leaderboard utilities
- **MarkdownExplanation.tsx**: Markdown explanation component
- **metrics.ts**: Metrics and analytics
- **questionUtils.ts**: Question processing utilities
- **shareCodeUtils.ts**: Share code generation
- **storage.ts**: Local storage utilities
- **testParams.ts**: Test parameter utilities
- **textTransforms.ts**: Text transformation utilities
- **timeManagement.ts**: Time management utilities
- **userProfile.ts**: User profile utilities

## Key Features

### 1. Authentication System
- Supabase Auth integration
- Google OAuth support
- Session management
- Profile synchronization

### 2. Question Management
- Question bank with 4000+ questions
- Multiple question types (MCQ, FRQ)
- AI-powered explanations
- Difficulty ratings

### 3. Practice Modes
- Timed tests
- Unlimited practice
- Shared tests
- Adaptive difficulty

### 4. Team Collaboration
- Team creation and management
- Member invitations
- Team assignments
- Leaderboards

### 5. Analytics and Reporting
- User performance tracking
- ELO rating system
- Progress analytics
- Content reporting

### 6. AI Integration
- Google Gemini 2.0 integration
- Question analysis
- Explanation generation
- Free response grading

## Technical Architecture

### Next.js 15 App Router
- Route-based file organization
- Server and client components
- API routes
- Dynamic routes

### State Management
- React Context API
- Local state management
- Server state synchronization

### Styling
- Tailwind CSS
- Responsive design
- Dark/light mode support
- Custom components

### Performance
- Code splitting
- Lazy loading
- Image optimization
- Caching strategies

## Development Guidelines

### File Organization
- Route-based file structure
- Component co-location
- API route organization
- Utility separation

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Component composition
- Error handling

### Testing
- Unit tests for utilities
- Component testing
- API route testing
- Integration tests

---

*This documentation provides a comprehensive overview of the Scio.ly application structure and functionality.*

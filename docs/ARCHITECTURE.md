# Scio.ly Architecture Documentation

## Project Overview

Scio.ly is a comprehensive Science Olympiad practice platform built with Next.js 15, TypeScript, and modern web technologies. The platform provides over 4000 Science Olympiad questions across 24 Division C events, with AI-powered explanations, team collaboration features, and multiple practice modes.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript 5.9.2
- **Styling**: Tailwind CSS 4.1.13
- **UI Components**: React 19.1.1 with custom components
- **State Management**: React Context API
- **Charts**: ApexCharts 5.3.3, Chart.js 4.5.0
- **Animations**: Framer Motion 12.23.12
- **Icons**: Lucide React 0.539.0, React Icons 5.5.0

### Backend
- **API**: Next.js API Routes
- **Database**: 
  - Supabase (PostgreSQL) for user data and authentication
  - CockroachDB for teams and advanced features
- **Authentication**: Supabase Auth with Google OAuth
- **AI Integration**: Google Gemini 2.0 for explanations and grading

### Development & Testing
- **Testing**: Vitest 3.2.4 with React Testing Library
- **Linting**: ESLint 9.36.0
- **Database ORM**: Drizzle ORM 0.44.4
- **Package Manager**: pnpm 9.15.4

## Project Structure

### Root Level
- **Configuration Files**: Next.js, TypeScript, Tailwind, ESLint configurations
- **Database**: Drizzle migrations and schema files
- **Scripts**: Database initialization and utility scripts
- **Documentation**: Comprehensive markdown documentation

### Source Code (`src/`)

#### `src/app/` - Next.js App Router
The main application directory following Next.js 15 App Router conventions:

- **Pages**: Route-based pages for different features
- **API Routes**: Backend API endpoints
- **Components**: Reusable UI components
- **Utils**: Application-specific utilities

#### `src/lib/` - Shared Libraries
Core business logic and utilities:

- **Database**: Database connections and queries
- **Services**: Business logic services
- **Utils**: Shared utility functions
- **Types**: TypeScript type definitions

#### `src/docs/` - Documentation
Markdown documentation for Science Olympiad events and rules.

#### `src/test-utils/` - Testing Utilities
Shared testing utilities and providers.

## Key Features

### 1. Question Management
- **Question Bank**: 4000+ Science Olympiad questions
- **Event Coverage**: 24 Division C events
- **Question Types**: Multiple Choice (MCQ) and Free Response (FRQ)
- **AI Explanations**: Gemini 2.0 powered explanations

### 2. Practice Modes
- **Timed Tests**: Competition simulation
- **Unlimited Practice**: Endless practice sessions
- **Shared Tests**: Team collaboration via test codes
- **Adaptive Difficulty**: AI-powered difficulty ratings

### 3. Team Features
- **Team Management**: Create and manage teams
- **Collaboration**: Share tests and assignments
- **Leaderboards**: Track team performance
- **Notifications**: Real-time team updates

### 4. User Experience
- **Authentication**: Google OAuth integration
- **Progress Tracking**: User performance analytics
- **Bookmarks**: Save favorite questions
- **Responsive Design**: Mobile-first approach

## Database Architecture

### Supabase (Primary Database)
- **Users**: User profiles and authentication
- **Questions**: Question bank and metadata
- **Tests**: Test sessions and results
- **Bookmarks**: User bookmarks and favorites

### CockroachDB (Teams Database)
- **Teams**: Team management and collaboration
- **Assignments**: Team assignments and submissions
- **Notifications**: Team notifications system
- **Leaderboards**: Team performance tracking

## API Architecture

### Authentication
- **Supabase Auth**: User authentication and session management
- **Google OAuth**: Social login integration
- **JWT Tokens**: Secure API access

### API Endpoints
- **Questions**: Question retrieval and management
- **Tests**: Test creation and submission
- **Teams**: Team management and collaboration
- **AI Services**: Gemini integration for explanations
- **Analytics**: User and team analytics

## Security Features

- **Rate Limiting**: API rate limiting for abuse prevention
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Secure cross-origin requests
- **Environment Variables**: Secure configuration management

## Performance Optimizations

- **Next.js Optimizations**: App Router, Server Components
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Dynamic imports and lazy loading
- **Caching**: Database query caching
- **CDN**: Static asset delivery

## Development Workflow

### Testing
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: API endpoint testing
- **Coverage**: Comprehensive test coverage reporting

### Database Management
- **Migrations**: Drizzle ORM migrations
- **Schema Management**: Type-safe database schemas
- **Seeding**: Database initialization scripts

### Deployment
- **Build Process**: Next.js production builds
- **Environment Management**: Multiple environment support
- **Monitoring**: Health checks and analytics

## Future Enhancements

- **Division B Support**: Expansion to Division B events
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Enhanced performance tracking
- **AI Improvements**: Better explanation quality
- **Team Features**: Enhanced collaboration tools

## Contributing

The project follows modern development practices with:
- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Testing**: Comprehensive test coverage
- **Documentation**: TSDoc comments throughout
- **Git Workflow**: Feature branches and pull requests

---

*This architecture documentation provides a comprehensive overview of the Scio.ly platform's technical implementation and design decisions.*

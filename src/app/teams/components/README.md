# Scio.ly Teams Components Documentation

## Overview

The `src/app/teams/components/` directory contains all React components for the team management system. These components handle team creation, management, collaboration, and user interface for the Scio.ly team features.

## Directory Structure

### Core Team Components

#### `TeamDashboard.tsx`
- **Purpose**: Main team dashboard component
- **Features**: 
  - Team overview and statistics
  - Member management interface
  - Assignment tracking
  - Team calendar integration
  - Roster linking functionality
- **Dependencies**: Team API, user authentication, calendar system
- **Props**: Team data, user permissions, team settings
- **State Management**: Team state, member state, assignment state

#### `TeamsLanding.tsx`
- **Purpose**: Teams landing page component
- **Features**:
  - Team discovery interface
  - Division-based team browsing
  - Team creation prompts
  - Team statistics display
- **Dependencies**: Team API, division data
- **Props**: User authentication state, team data

#### `TeamsPageClient.tsx`
- **Purpose**: Client-side teams page wrapper
- **Features**:
  - Client-side rendering optimization
  - State management for teams page
  - Error handling and loading states
- **Dependencies**: Team API, authentication context
- **Props**: Server-side team data

### Team Creation & Management

#### `CreateTeamModal.tsx`
- **Purpose**: Team creation modal component
- **Features**:
  - Team creation form
  - Division selection
  - Team settings configuration
  - Validation and error handling
- **Dependencies**: Team API, form validation
- **Props**: Modal state, callback functions
- **State Management**: Form state, validation state

#### `JoinTeamModal.tsx`
- **Purpose**: Team joining modal component
- **Features**:
  - Team code input
  - Team search functionality
  - Join request handling
  - Team information display
- **Dependencies**: Team API, team search
- **Props**: Modal state, callback functions
- **State Management**: Form state, search state

#### `TeamShareModal.tsx`
- **Purpose**: Team sharing modal component
- **Features**:
  - Share code generation
  - Team link creation
  - Sharing options configuration
  - Copy-to-clipboard functionality
- **Dependencies**: Team API, sharing system
- **Props**: Team data, modal state
- **State Management**: Share state, link state

### Assignment System

#### `AssignmentViewer.tsx`
- **Purpose**: Assignment viewing component
- **Features**:
  - Assignment display
  - Submission interface
  - Progress tracking
  - Due date management
- **Dependencies**: Assignment API, user authentication
- **Props**: Assignment data, user permissions
- **State Management**: Assignment state, submission state

#### `EnhancedAssignmentCreator.tsx`
- **Purpose**: Advanced assignment creation component
- **Features**:
  - Rich assignment editor
  - Question generation
  - Assignment templates
  - Advanced settings
- **Dependencies**: Assignment API, question system
- **Props**: Team data, assignment templates
- **State Management**: Editor state, template state

### Team Organization

#### `DivisionGroupsGrid.tsx`
- **Purpose**: Division-based team grid display
- **Features**:
  - Division-based team organization
  - Team grid layout
  - Team statistics display
  - Navigation between divisions
- **Dependencies**: Team API, division data
- **Props**: Team data, division information
- **State Management**: Grid state, filter state

#### `Leaderboard.tsx`
- **Purpose**: Team leaderboard component
- **Features**:
  - Team performance rankings
  - Score tracking
  - Competition results
  - Historical data display
- **Dependencies**: Leaderboard API, team data
- **Props**: Leaderboard data, team information
- **State Management**: Leaderboard state, filter state

### Calendar & Events

#### `TeamCalendar.tsx`
- **Purpose**: Team calendar component
- **Features**:
  - Event display and management
  - Calendar navigation
  - Event creation and editing
  - Recurring event support
- **Dependencies**: Calendar API, event system
- **Props**: Team data, calendar events
- **State Management**: Calendar state, event state

### Notifications & Communication

#### `NotificationBell.tsx`
- **Purpose**: Notification bell component
- **Features**:
  - Notification display
  - Unread count indicator
  - Notification management
  - Real-time updates
- **Dependencies**: Notification API, real-time system
- **Props**: Notification data, user preferences
- **State Management**: Notification state, unread state

#### `RosterLinkIndicator.tsx`
- **Purpose**: Roster linking status indicator
- **Features**:
  - Link status display
  - Linking progress indication
  - Status updates
  - User guidance
- **Dependencies**: Roster API, linking system
- **Props**: Roster data, link status
- **State Management**: Link state, status state

### Utility Components

#### Leaderboard Utilities (`leaderboard/`)
- **`constants.ts`**: Leaderboard constants and configuration
- **`utils.ts`**: Leaderboard utility functions
- **Features**: Score calculation, ranking logic, data processing
- **Dependencies**: Leaderboard data, scoring algorithms

## Component Architecture

### State Management
- **React Hooks**: useState, useEffect, useContext
- **Custom Hooks**: Team-specific hooks for data management
- **Context Integration**: Authentication and team context
- **Local State**: Component-specific state management

### Data Flow
- **Props Down**: Data passed from parent components
- **Events Up**: User interactions passed to parent
- **API Integration**: Direct API calls for data fetching
- **Real-time Updates**: WebSocket integration for live updates

### Error Handling
- **Error Boundaries**: Component-level error handling
- **Loading States**: Loading indicators and states
- **Validation**: Form validation and error display
- **Fallbacks**: Graceful degradation for failed operations

### Performance Optimization
- **Memoization**: React.memo for expensive components
- **Lazy Loading**: Dynamic imports for large components
- **Virtualization**: Efficient rendering for large lists
- **Caching**: API response caching

## Key Features

### 1. Team Management
- **Team Creation**: Complete team creation workflow
- **Member Management**: Add, remove, and manage team members
- **Role Management**: Captain, co-captain, member roles
- **Team Settings**: Configuration and customization

### 2. Assignment System
- **Assignment Creation**: Rich assignment creation interface
- **Question Generation**: AI-powered question generation
- **Submission Handling**: Assignment submission and grading
- **Progress Tracking**: Assignment progress and analytics

### 3. Collaboration Features
- **Team Sharing**: Share teams and content
- **Real-time Updates**: Live team updates and notifications
- **Calendar Integration**: Team event management
- **Communication**: Team messaging and announcements

### 4. Analytics & Reporting
- **Team Performance**: Team statistics and analytics
- **Leaderboards**: Team rankings and competitions
- **Progress Tracking**: Individual and team progress
- **Historical Data**: Performance history and trends

### 5. User Experience
- **Responsive Design**: Mobile and desktop optimization
- **Accessibility**: WCAG compliance and accessibility features
- **Performance**: Optimized rendering and data loading
- **Error Handling**: Comprehensive error management

## Testing

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **User Interaction Tests**: User behavior testing
- **Accessibility Tests**: Accessibility compliance testing

### Test Files
- **`AssignmentViewer.test.tsx`**: Assignment viewer testing
- **`CreateTeamModal.test.tsx`**: Team creation testing
- **`DivisionGroupsGrid.test.tsx`**: Division grid testing
- **`EnhancedAssignmentCreator.test.tsx`**: Assignment creator testing
- **`JoinTeamModal.test.tsx`**: Team joining testing
- **`NotificationBell.test.tsx`**: Notification testing
- **`RosterLinkIndicator.test.tsx`**: Roster linking testing
- **`TeamCalendar.test.tsx`**: Calendar testing
- **`TeamDashboard.test.tsx`**: Dashboard testing
- **`TeamDashboard-roster-linking.test.tsx`**: Roster linking testing
- **`TeamShareModal.test.tsx`**: Team sharing testing
- **`TeamsLanding.test.tsx`**: Landing page testing
- **`TeamsPageClient.test.tsx`**: Page client testing

## Dependencies

### Core Dependencies
- **React**: Component framework
- **TypeScript**: Type safety
- **Next.js**: Framework integration
- **Tailwind CSS**: Styling framework

### Team Dependencies
- **Team API**: Team management services
- **Authentication**: User authentication system
- **Calendar**: Calendar and event management
- **Notifications**: Real-time notification system

### UI Dependencies
- **React Icons**: Icon library
- **Framer Motion**: Animation library
- **React Hook Form**: Form management
- **React Query**: Data fetching and caching

## Development Guidelines

### Component Structure
- **Single Responsibility**: Each component has a clear purpose
- **Composition**: Components composed of smaller components
- **Reusability**: Reusable components across the application
- **Maintainability**: Clear structure and documentation

### Code Standards
- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Testing**: Comprehensive test coverage

### Performance
- **Optimization**: Performance optimization techniques
- **Caching**: Efficient data caching
- **Lazy Loading**: Dynamic component loading
- **Bundle Size**: Optimized bundle sizes

---

*This documentation provides a comprehensive overview of the Scio.ly teams components and their functionality.*

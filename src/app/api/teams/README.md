# Scio.ly Teams API Documentation

## Overview

The `src/app/api/teams/` directory contains the comprehensive teams API endpoints for the Scio.ly platform. This system provides extensive team management functionality including team creation, roster management, assignments, and team collaboration features.

## Directory Structure

### Core Teams API Endpoints

#### `by-code/`
- **Purpose**: Team lookup by code
- **Features**:
  - Team code validation
  - Team information retrieval
  - Code-based team access
  - Team verification
- **Dependencies**: Team database, code validation
- **Methods**: GET, POST
- **Request**: Team code, user context
- **Response**: Team information, access permissions

#### `create/`
- **Purpose**: Team creation
- **Features**:
  - New team creation
  - Team configuration
  - Initial setup
  - Team validation
- **Dependencies**: Team database, user authentication
- **Methods**: POST
- **Request**: Team data, configuration
- **Response**: Created team, team information

#### `group/[slug]/`
- **Purpose**: Team group management by slug
- **Features**:
  - Group information retrieval
  - Group management
  - Slug-based access
  - Group operations
- **Dependencies**: Group database, slug resolution
- **Methods**: GET, PUT, DELETE
- **Request**: Group slug, operation data
- **Response**: Group information, operation results

#### `invite/`
- **Purpose**: Team invitation management
- **Features**:
  - Invitation creation
  - Invitation sending
  - Invitation management
  - Invitation tracking
- **Dependencies**: Invitation system, email service
- **Methods**: POST, GET, PUT, DELETE
- **Request**: Invitation data, recipient information
- **Response**: Invitation status, invitation details

#### `join-by-code/`
- **Purpose**: Team joining by code
- **Features**:
  - Code-based team joining
  - Join validation
  - Membership creation
  - Join confirmation
- **Dependencies**: Team database, code validation
- **Methods**: POST
- **Request**: Join code, user information
- **Response**: Join status, membership details

#### `link-request/`
- **Purpose**: Team linking requests
- **Features**:
  - Link request creation
  - Request management
  - Link approval
  - Link status tracking
- **Dependencies**: Link system, request management
- **Methods**: POST, GET, PUT
- **Request**: Link request data, approval status
- **Response**: Request status, link information

#### `links/`
- **Purpose**: Team link management
- **Features**:
  - Link creation
  - Link management
  - Link validation
  - Link operations
- **Dependencies**: Link system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Link data, operation parameters
- **Response**: Link information, operation results

#### `share/`
- **Purpose**: Team sharing functionality
- **Features**:
  - Team content sharing
  - Share link generation
  - Share management
  - Share permissions
- **Dependencies**: Share system, permission management
- **Methods**: POST, GET, PUT, DELETE
- **Request**: Share data, permission settings
- **Response**: Share links, share status

#### `units/[slug]/`
- **Purpose**: Team unit management by slug
- **Features**:
  - Unit information retrieval
  - Unit management
  - Slug-based access
  - Unit operations
- **Dependencies**: Unit database, slug resolution
- **Methods**: GET, PUT, DELETE
- **Request**: Unit slug, operation data
- **Response**: Unit information, operation results

#### `units/`
- **Purpose**: Team unit management
- **Features**:
  - Unit listing
  - Unit creation
  - Unit management
  - Unit operations
- **Dependencies**: Unit database, team system
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Unit data, operation parameters
- **Response**: Unit list, unit information

#### `unlink/`
- **Purpose**: Team unlinking
- **Features**:
  - Link removal
  - Unlink confirmation
  - Status updates
  - Cleanup operations
- **Dependencies**: Link system, team database
- **Methods**: POST, DELETE
- **Request**: Unlink data, confirmation
- **Response**: Unlink status, updated information

#### `user-teams/`
- **Purpose**: User team management
- **Features**:
  - User team listing
  - Team membership
  - User team operations
  - Membership management
- **Dependencies**: User system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: User data, team parameters
- **Response**: User teams, membership information

### Teams V2 API

#### `v2/`
- **Purpose**: Enhanced teams API v2
- **Features**:
  - Advanced team management
  - Enhanced functionality
  - Improved performance
  - Extended features
- **Dependencies**: Enhanced team system, v2 features
- **Methods**: All HTTP methods
- **Request**: Enhanced team data, v2 parameters
- **Response**: Enhanced responses, v2 features

#### `v2/[teamId]/`
- **Purpose**: Team-specific operations
- **Features**:
  - Team-specific management
  - Team operations
  - Team data access
  - Team functionality
- **Dependencies**: Team database, team operations
- **Methods**: GET, PUT, DELETE
- **Request**: Team ID, operation data
- **Response**: Team data, operation results

#### `v2/[teamId]/archive/`
- **Purpose**: Team archiving
- **Features**:
  - Team archiving
  - Archive management
  - Archive status
  - Archive operations
- **Dependencies**: Archive system, team database
- **Methods**: POST, GET, PUT, DELETE
- **Request**: Archive data, team information
- **Response**: Archive status, archive information

#### `v2/[teamId]/assignments/`
- **Purpose**: Team assignment management
- **Features**:
  - Assignment creation
  - Assignment management
  - Assignment distribution
  - Assignment tracking
- **Dependencies**: Assignment system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Assignment data, team parameters
- **Response**: Assignments, assignment details

#### `v2/[teamId]/assignments/[assignmentId]/submit/`
- **Purpose**: Assignment submission
- **Features**:
  - Assignment submission
  - Submission validation
  - Submission tracking
  - Submission management
- **Dependencies**: Submission system, assignment database
- **Methods**: POST, GET, PUT
- **Request**: Submission data, assignment ID
- **Response**: Submission status, submission details

#### `v2/[teamId]/assignments/enhanced/`
- **Purpose**: Enhanced assignment features
- **Features**:
  - Advanced assignment features
  - Enhanced functionality
  - Improved assignment management
  - Extended capabilities
- **Dependencies**: Enhanced assignment system, advanced features
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Enhanced assignment data, advanced parameters
- **Response**: Enhanced assignments, advanced features

#### `v2/[teamId]/assignments/generate-questions/`
- **Purpose**: Question generation for assignments
- **Features**:
  - Automatic question generation
  - Question selection
  - Question configuration
  - Question management
- **Dependencies**: Question system, generation algorithms
- **Methods**: POST, GET
- **Request**: Generation parameters, question criteria
- **Response**: Generated questions, question details

#### `v2/[teamId]/codes/`
- **Purpose**: Team code management
- **Features**:
  - Code generation
  - Code management
  - Code validation
  - Code operations
- **Dependencies**: Code system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Code data, team parameters
- **Response**: Team codes, code information

#### `v2/[teamId]/events/`
- **Purpose**: Team event management
- **Features**:
  - Event creation
  - Event management
  - Event scheduling
  - Event tracking
- **Dependencies**: Event system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Event data, team parameters
- **Response**: Team events, event details

#### `v2/[teamId]/exit/`
- **Purpose**: Team exit functionality
- **Features**:
  - Team exit processing
  - Exit confirmation
  - Status updates
  - Cleanup operations
- **Dependencies**: Exit system, team database
- **Methods**: POST, DELETE
- **Request**: Exit data, confirmation
- **Response**: Exit status, updated information

#### `v2/[teamId]/invite/`
- **Purpose**: Team invitation management
- **Features**:
  - Invitation creation
  - Invitation management
  - Invitation tracking
  - Invitation operations
- **Dependencies**: Invitation system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Invitation data, team parameters
- **Response**: Invitations, invitation details

#### `v2/[teamId]/materials/`
- **Purpose**: Team materials management
- **Features**:
  - Material upload
  - Material management
  - Material sharing
  - Material organization
- **Dependencies**: Material system, file storage
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Material data, file information
- **Response**: Materials, material details

#### `v2/[teamId]/members/`
- **Purpose**: Team member management
- **Features**:
  - Member listing
  - Member management
  - Member operations
  - Membership tracking
- **Dependencies**: Member system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Member data, team parameters
- **Response**: Team members, member details

#### `v2/[teamId]/members/[userId]/`
- **Purpose**: Individual member management
- **Features**:
  - Member-specific operations
  - Member management
  - Member data access
  - Member functionality
- **Dependencies**: Member system, user database
- **Methods**: GET, PUT, DELETE
- **Request**: User ID, member data
- **Response**: Member information, operation results

#### `v2/[teamId]/posts/`
- **Purpose**: Team post management
- **Features**:
  - Post creation
  - Post management
  - Post sharing
  - Post organization
- **Dependencies**: Post system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Post data, team parameters
- **Response**: Team posts, post details

#### `v2/[teamId]/roster/`
- **Purpose**: Team roster management
- **Features**:
  - Roster management
  - Roster operations
  - Roster updates
  - Roster tracking
- **Dependencies**: Roster system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Roster data, team parameters
- **Response**: Team roster, roster details

#### `v2/[teamId]/roster/invite/`
- **Purpose**: Roster invitation management
- **Features**:
  - Roster invitation creation
  - Invitation management
  - Invitation tracking
  - Invitation operations
- **Dependencies**: Invitation system, roster database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Invitation data, roster parameters
- **Response**: Roster invitations, invitation details

#### `v2/[teamId]/roster/link-status/`
- **Purpose**: Roster link status management
- **Features**:
  - Link status tracking
  - Status updates
  - Status management
  - Status operations
- **Dependencies**: Link system, status tracking
- **Methods**: GET, POST, PUT
- **Request**: Status data, link parameters
- **Response**: Link status, status details

#### `v2/[teamId]/subteams/[subteamId]/`
- **Purpose**: Subteam management
- **Features**:
  - Subteam operations
  - Subteam management
  - Subteam data access
  - Subteam functionality
- **Dependencies**: Subteam system, team database
- **Methods**: GET, PUT, DELETE
- **Request**: Subteam ID, subteam data
- **Response**: Subteam information, operation results

#### `v2/[teamId]/subteams/`
- **Purpose**: Subteam listing and management
- **Features**:
  - Subteam listing
  - Subteam creation
  - Subteam management
  - Subteam operations
- **Dependencies**: Subteam system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Subteam data, team parameters
- **Response**: Subteams, subteam details

#### `v2/archived/`
- **Purpose**: Archived teams management
- **Features**:
  - Archived team listing
  - Archive management
  - Archive operations
  - Archive status
- **Dependencies**: Archive system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Archive data, team parameters
- **Response**: Archived teams, archive details

#### `v2/create/`
- **Purpose**: Team creation v2
- **Features**:
  - Enhanced team creation
  - Advanced configuration
  - Creation validation
  - Setup automation
- **Dependencies**: Enhanced team system, creation algorithms
- **Methods**: POST
- **Request**: Enhanced team data, advanced parameters
- **Response**: Created team, advanced features

#### `v2/health/`
- **Purpose**: Teams API health check
- **Features**:
  - API health monitoring
  - Service status
  - Performance metrics
  - Health reporting
- **Dependencies**: Health monitoring, service status
- **Methods**: GET
- **Request**: Health check parameters
- **Response**: Health status, service information

#### `v2/join/`
- **Purpose**: Team joining v2
- **Features**:
  - Enhanced joining process
  - Advanced validation
  - Join automation
  - Join tracking
- **Dependencies**: Enhanced join system, advanced validation
- **Methods**: POST
- **Request**: Enhanced join data, advanced parameters
- **Response**: Join status, advanced features

#### `v2/notifications/`
- **Purpose**: Team notifications management
- **Features**:
  - Notification creation
  - Notification management
  - Notification delivery
  - Notification tracking
- **Dependencies**: Notification system, team database
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Notification data, team parameters
- **Response**: Notifications, notification details

#### `v2/roster-notifications/`
- **Purpose**: Roster notification management
- **Features**:
  - Roster notification creation
  - Notification management
  - Roster updates
  - Notification delivery
- **Dependencies**: Roster system, notification service
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Roster notification data, team parameters
- **Response**: Roster notifications, notification details

#### `v2/user-teams/`
- **Purpose**: User teams v2
- **Features**:
  - Enhanced user team management
  - Advanced functionality
  - Improved performance
  - Extended features
- **Dependencies**: Enhanced user system, advanced features
- **Methods**: GET, POST, PUT, DELETE
- **Request**: Enhanced user data, advanced parameters
- **Response**: Enhanced user teams, advanced features

## Teams API System Architecture

### Team Management
- **Team Creation**: Comprehensive team creation system
- **Team Configuration**: Team settings and preferences
- **Team Administration**: Team administration tools
- **Team Collaboration**: Team collaboration features

### Roster Management
- **Member Management**: Team member management
- **Roster Organization**: Roster organization and structure
- **Member Statistics**: Member performance statistics
- **Roster Analytics**: Roster analytics and reporting

### Assignment Management
- **Assignment Creation**: Assignment creation and configuration
- **Assignment Distribution**: Assignment distribution and sharing
- **Assignment Tracking**: Assignment progress tracking
- **Assignment Analytics**: Assignment analytics and reporting

### Calendar Integration
- **Event Management**: Team event management
- **Calendar Integration**: Calendar system integration
- **Scheduling**: Event scheduling and management
- **Notifications**: Event notifications and reminders

## Key Features

### 1. Team Operations
- **Team Creation**: Comprehensive team creation
- **Team Management**: Team administration and management
- **Team Configuration**: Team settings and preferences
- **Team Collaboration**: Team collaboration tools

### 2. Member Management
- **Member Addition**: Adding team members
- **Member Removal**: Removing team members
- **Member Roles**: Role assignment and management
- **Member Permissions**: Permission management

### 3. Assignment System
- **Assignment Creation**: Creating team assignments
- **Assignment Distribution**: Distributing assignments
- **Assignment Tracking**: Tracking assignment progress
- **Assignment Grading**: Grading assignments

### 4. Calendar System
- **Event Creation**: Creating team events
- **Event Management**: Managing team events
- **Event Scheduling**: Scheduling team events
- **Event Notifications**: Event notifications and reminders

## Technical Implementation

### API Architecture
- **RESTful Design**: Standard REST API patterns
- **Error Handling**: Comprehensive error management
- **Authentication**: Secure API access
- **Rate Limiting**: API usage management

### Database Integration
- **Team Database**: Team data storage
- **User Database**: User data management
- **Assignment Database**: Assignment data storage
- **Calendar Database**: Calendar data management

### Performance
- **Optimization**: API performance optimization
- **Caching**: Strategic response caching
- **Monitoring**: API performance monitoring
- **Scalability**: API scalability management

## API Endpoints

### Team Management
```typescript
// Create team
POST /api/teams/create
{
  "name": "string",
  "description": "string",
  "settings": "object"
}

// Get team by code
GET /api/teams/by-code?code=TEAM123

// Update team
PUT /api/teams/v2/[teamId]
{
  "name": "string",
  "description": "string",
  "settings": "object"
}
```

### Member Management
```typescript
// Add member
POST /api/teams/v2/[teamId]/members
{
  "userId": "string",
  "role": "member" | "captain"
}

// Remove member
DELETE /api/teams/v2/[teamId]/members/[userId]

// Update member role
PUT /api/teams/v2/[teamId]/members/[userId]
{
  "role": "member" | "captain"
}
```

### Assignment Management
```typescript
// Create assignment
POST /api/teams/v2/[teamId]/assignments
{
  "title": "string",
  "description": "string",
  "questions": "object[]",
  "dueDate": "string"
}

// Submit assignment
POST /api/teams/v2/[teamId]/assignments/[assignmentId]/submit
{
  "answers": "object[]",
  "submissionTime": "string"
}
```

## Error Handling

### API Errors
- **Authentication**: API authentication errors
- **Validation**: Request validation errors
- **Processing**: Content processing errors
- **Response**: Response generation errors

### Team Errors
- **Team Not Found**: Team does not exist
- **Permission Denied**: Insufficient permissions
- **Member Limit**: Team member limit reached
- **Invalid Operation**: Invalid team operation

## Performance Optimization

### Caching Strategy
- **Response Caching**: API response caching
- **Request Deduplication**: Duplicate request handling
- **Cache Invalidation**: Cache management
- **Performance Monitoring**: Cache performance tracking

### Request Optimization
- **Batching**: Request batching for efficiency
- **Compression**: Response compression
- **Streaming**: Real-time response streaming
- **Error Recovery**: Request retry mechanisms

## Testing

### Test Coverage
- **Unit Tests**: Individual endpoint testing
- **Integration Tests**: Team system integration testing
- **Performance Tests**: API performance testing
- **Error Tests**: Error handling testing

### Test Files
- **Route Tests**: API endpoint testing
- **Service Tests**: Team service testing
- **Integration Tests**: End-to-end testing
- **Performance Tests**: Load testing

## Dependencies

### Core Dependencies
- **Next.js**: API framework
- **TypeScript**: Type safety
- **Supabase**: Database integration
- **CockroachDB**: Team database

### Team Dependencies
- **Team System**: Team management system
- **User System**: User management system
- **Assignment System**: Assignment management system
- **Calendar System**: Calendar integration

## Usage Examples

### Team Creation
```typescript
const team = await fetch('/api/teams/v2/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Science Olympiad Team',
    description: 'Competitive team for Science Olympiad',
    division: 'C',
    school: 'Example High School'
  })
});
```

### Member Management
```typescript
const members = await fetch('/api/teams/v2/TEAM123/members', {
  method: 'GET'
});

const addMember = await fetch('/api/teams/v2/TEAM123/members', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'USER456',
    role: 'member'
  })
});
```

### Assignment Creation
```typescript
const assignment = await fetch('/api/teams/v2/TEAM123/assignments', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Practice Test',
    description: 'Weekly practice test',
    questions: questionData,
    dueDate: '2024-01-15T23:59:59Z'
  })
});
```

## Development Guidelines

### API Design
- **RESTful Patterns**: Standard REST API design
- **Error Handling**: Comprehensive error management
- **Documentation**: Clear API documentation
- **Testing**: Thorough API testing

### Performance
- **Optimization**: API performance optimization
- **Caching**: Strategic response caching
- **Monitoring**: Performance monitoring
- **Scalability**: API scalability planning

### Security
- **Authentication**: Secure API access
- **Validation**: Input validation
- **Rate Limiting**: API usage limits
- **Error Handling**: Secure error responses

---

*This documentation provides a comprehensive overview of the Scio.ly Teams API system and its functionality.*

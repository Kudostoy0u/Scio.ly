# Scio.ly Services Directory Documentation

## Overview

The `src/lib/services/` directory contains core business logic services for the Scio.ly platform. These services handle AI integration, team management, database operations, and other critical platform functionality.

## Directory Structure

### AI Integration Services

#### `gemini.ts`
- **Purpose**: Google Gemini AI integration service
- **Features**:
  - Question explanation generation
  - Free response question grading
  - Question analysis and improvement suggestions
  - Content validation and editing
  - Image processing for visual questions
  - Streaming content generation
- **Key Methods**:
  - `explain()`: Generate detailed question explanations
  - `gradeFreeResponses()`: AI-powered grading system
  - `suggestEdit()`: Question improvement suggestions
  - `validateEdit()`: Edit validation and approval
  - `analyzeQuestion()`: Question quality analysis
  - `extractQuestions()`: Question extraction from text
  - `improveReason()`: User reasoning enhancement
- **Dependencies**: Google Gemini API, image processing
- **Configuration**: Multiple API key support for load balancing

#### `__tests__/roster-notifications.test.ts`
- **Purpose**: Roster notification service testing
- **Features**: Comprehensive test coverage for notification system
- **Dependencies**: Testing framework, mock services

### Team Management Services

#### `teams.ts`
- **Purpose**: Core team management service
- **Features**:
  - Team CRUD operations
  - Member management
  - Team permissions and roles
  - Team settings and configuration
- **Dependencies**: Team database, user authentication
- **Usage**: Team operations and management

#### `cockroachdb-teams.ts`
- **Purpose**: CockroachDB-specific team operations
- **Features**:
  - Advanced team functionality
  - Team analytics and reporting
  - Distributed team data management
  - Performance optimization for teams
- **Dependencies**: CockroachDB connection, team database
- **Usage**: High-performance team operations

#### `team-data.ts`
- **Purpose**: Team data processing and analytics
- **Features**:
  - Team data aggregation
  - Performance analytics
  - Team statistics generation
  - Data transformation and processing
- **Dependencies**: Team database, analytics system
- **Usage**: Team analytics and reporting

#### `roster-notifications.ts`
- **Purpose**: Team roster notification system
- **Features**:
  - Roster change notifications
  - Member update notifications
  - Real-time notification delivery
  - Notification management and tracking
- **Dependencies**: Notification system, team database
- **Usage**: Team communication and updates

## Service Architecture

### Design Patterns
- **Service Layer**: Business logic separation from UI components
- **Dependency Injection**: Service dependencies and configuration
- **Error Handling**: Comprehensive error management
- **Logging**: Service-level logging and monitoring

### Data Flow
- **API Integration**: External service integration
- **Database Operations**: Data persistence and retrieval
- **Real-time Updates**: Live data synchronization
- **Caching**: Service-level caching strategies

### Performance Optimization
- **Connection Pooling**: Database connection management
- **Load Balancing**: Multiple API key support
- **Caching**: Response caching and optimization
- **Async Operations**: Non-blocking service operations

## Key Features

### 1. AI Integration
- **Google Gemini 2.0**: Advanced AI capabilities
- **Question Analysis**: AI-powered question quality assessment
- **Explanation Generation**: Automated educational explanations
- **Content Processing**: AI content enhancement and validation
- **Image Support**: Visual question processing
- **Streaming**: Real-time AI response streaming

### 2. Team Management
- **Team Operations**: Complete team lifecycle management
- **Member Management**: Team membership and roles
- **Collaboration**: Team sharing and collaboration features
- **Analytics**: Team performance and analytics
- **Notifications**: Real-time team notifications

### 3. Database Integration
- **Multi-Database Support**: Supabase and CockroachDB
- **Connection Management**: Efficient database connections
- **Query Optimization**: Performance-optimized queries
- **Data Consistency**: Cross-database data consistency

### 4. Real-time Features
- **Live Updates**: Real-time data synchronization
- **Notifications**: Push notification system
- **Collaboration**: Real-time collaboration features
- **Status Updates**: Live status monitoring

## Technical Implementation

### Service Configuration
- **Environment Variables**: Service configuration via environment
- **API Keys**: Secure API key management
- **Database Connections**: Database connection configuration
- **Service Dependencies**: Inter-service dependencies

### Error Handling
- **Service Errors**: Service-specific error handling
- **API Failures**: External API error management
- **Database Errors**: Database operation error handling
- **Network Issues**: Network failure handling

### Performance
- **Service Optimization**: Performance optimization techniques
- **Caching Strategies**: Service-level caching
- **Load Balancing**: Multiple service instance support
- **Resource Management**: Efficient resource utilization

## Development Guidelines

### Service Design
- **Single Responsibility**: Each service has a clear purpose
- **Interface Definition**: Clear service interfaces
- **Dependency Management**: Proper dependency injection
- **Error Handling**: Comprehensive error management

### Code Standards
- **TypeScript**: Full type safety
- **Documentation**: Comprehensive service documentation
- **Testing**: Service-level testing
- **Logging**: Service operation logging

### Performance
- **Optimization**: Service performance optimization
- **Caching**: Efficient caching strategies
- **Resource Management**: Proper resource utilization
- **Monitoring**: Service performance monitoring

## Dependencies

### Core Dependencies
- **Google Gemini**: AI service integration
- **Supabase**: Authentication and primary database
- **CockroachDB**: Secondary database for teams
- **TypeScript**: Type safety and development

### Service Dependencies
- **Database Clients**: Database connection clients
- **API Clients**: External API integration
- **Notification Services**: Real-time notification system
- **Analytics Services**: Data analytics and reporting

### Development Dependencies
- **Testing Framework**: Service testing utilities
- **Mock Services**: External service mocking
- **Logging Framework**: Service logging utilities
- **Monitoring Tools**: Service monitoring and metrics

## Usage Examples

### AI Service Usage
```typescript
import { geminiService } from '@/lib/services/gemini';

// Generate question explanation
const explanation = await geminiService.explain(question, userAnswer, event);

// Grade free response questions
const grades = await geminiService.gradeFreeResponses(responses);

// Analyze question quality
const analysis = await geminiService.analyzeQuestion(question);
```

### Team Service Usage
```typescript
import { teamsService } from '@/lib/services/teams';

// Create new team
const team = await teamsService.createTeam(teamData);

// Get team members
const members = await teamsService.getTeamMembers(teamId);

// Update team settings
await teamsService.updateTeamSettings(teamId, settings);
```

### Notification Service Usage
```typescript
import { rosterNotificationsService } from '@/lib/services/roster-notifications';

// Send roster update notification
await rosterNotificationsService.sendRosterUpdate(teamId, changes);

// Get notification history
const notifications = await rosterNotificationsService.getNotifications(userId);
```

## Testing

### Test Coverage
- **Unit Tests**: Individual service testing
- **Integration Tests**: Service integration testing
- **Mock Services**: External service mocking
- **Performance Tests**: Service performance testing

### Test Files
- **`roster-notifications.test.ts`**: Roster notification testing
- **Service Tests**: Individual service test files
- **Integration Tests**: Cross-service testing
- **Performance Tests**: Service performance testing

## Monitoring and Maintenance

### Service Monitoring
- **Health Checks**: Service health monitoring
- **Performance Metrics**: Service performance tracking
- **Error Tracking**: Service error monitoring
- **Usage Analytics**: Service usage analytics

### Maintenance
- **Service Updates**: Regular service updates
- **Dependency Updates**: Dependency management
- **Performance Optimization**: Continuous optimization
- **Security Updates**: Security patch management

---

*This documentation provides a comprehensive overview of the Scio.ly services architecture and functionality.*

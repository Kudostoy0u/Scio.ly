# Scio.ly Types Directory Documentation

## Overview

The `src/types/` directory contains TypeScript type definitions for the Scio.ly platform. This directory provides centralized type definitions for database schemas, API interfaces, and application data structures.

## Directory Structure

### `database.ts`
- **Purpose**: Database type definitions for the new teams feature
- **Features**: Comprehensive type definitions for team-related database entities
- **Key Interfaces**:

#### `NewTeamGroup`
- **Purpose**: Team group entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `school`: School name (string)
  - `division`: Division level ('B' | 'C')
  - `slug`: URL-friendly identifier (string)
  - `created_by`: Creator user ID (string)
  - `created_at`: Creation timestamp (string)
  - `updated_at`: Last update timestamp (string)

#### `NewTeamUnit`
- **Purpose**: Team unit entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `group_id`: Parent group ID (string)
  - `team_id`: Team identifier (string)
  - `name`: Team unit name (string)
  - `description`: Optional description (string)
  - `captain_code`: Captain access code (string)
  - `user_code`: User access code (string)
  - `created_by`: Creator user ID (string)
  - `created_at`: Creation timestamp (string)
  - `updated_at`: Last update timestamp (string)
  - `settings`: Team settings configuration (Record<string, any>)

#### `NewTeamMembership`
- **Purpose**: Team membership entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `user_id`: User identifier (string)
  - `team_id`: Team identifier (string)
  - `role`: Member role ('captain' | 'co_captain' | 'member' | 'observer')
  - `status`: Membership status ('active' | 'inactive' | 'pending' | 'banned')
  - `joined_at`: Join timestamp (string)
  - `invited_by`: Inviter user ID (optional string)
  - `permissions`: Member permissions (Record<string, any>)

#### `NewTeamPost`
- **Purpose**: Team post entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `team_id`: Team identifier (string)
  - `author_id`: Author user ID (string)
  - `content`: Post content (string)
  - `post_type`: Post type ('announcement' | 'discussion' | 'poll')
  - `is_pinned`: Pinned status (boolean)
  - `created_at`: Creation timestamp (string)
  - `updated_at`: Last update timestamp (string)

#### `NewTeamEvent`
- **Purpose**: Team event entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `team_id`: Team identifier (string)
  - `created_by`: Creator user ID (string)
  - `title`: Event title (string)
  - `description`: Optional event description (string)
  - `start_time`: Event start time (string)
  - `end_time`: Event end time (optional string)
  - `location`: Event location (optional string)
  - `event_type`: Event type ('practice' | 'competition' | 'meeting' | 'other')
  - `is_recurring`: Recurring event flag (boolean)
  - `recurrence_pattern`: Recurrence pattern (optional string)
  - `created_at`: Creation timestamp (string)
  - `updated_at`: Last update timestamp (string)

#### `NewTeamAssignment`
- **Purpose**: Team assignment entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `team_id`: Team identifier (string)
  - `created_by`: Creator user ID (string)
  - `title`: Assignment title (string)
  - `description`: Optional assignment description (string)
  - `assignment_type`: Assignment type ('homework' | 'project' | 'study' | 'other')
  - `due_date`: Due date (optional string)
  - `points`: Assignment points (optional number)
  - `is_published`: Published status (boolean)
  - `created_at`: Creation timestamp (string)
  - `updated_at`: Last update timestamp (string)

#### `NewTeamMaterial`
- **Purpose**: Team material entity type definition
- **Properties**:
  - `id`: Unique identifier (string)
  - `team_id`: Team identifier (string)
  - `uploaded_by`: Uploader user ID (string)
  - `title`: Material title (string)
  - `description`: Optional material description (string)
  - `file_url`: File URL (string)
  - `file_type`: File type (string)
  - `file_size`: File size in bytes (number)
  - `category`: Material category ('study_guide' | 'practice_test' | 'resource' | 'other')
  - `is_public`: Public visibility flag (boolean)
  - `created_at`: Creation timestamp (string)
  - `updated_at`: Last update timestamp (string)

## Key Features

### 1. Type Safety
- **Comprehensive Types**: Full type coverage for team-related entities
- **Strict Typing**: TypeScript strict mode compliance
- **Interface Definitions**: Clear interface definitions for all entities

### 2. Team Management Types
- **Team Groups**: School-based team organization
- **Team Units**: Individual team instances
- **Membership Management**: Role-based access control
- **Content Management**: Posts, events, assignments, materials

### 3. Data Structure Design
- **Hierarchical Structure**: Group → Unit → Membership hierarchy
- **Flexible Permissions**: Configurable permission system
- **Audit Trail**: Creation and update timestamps
- **Status Management**: Comprehensive status tracking

### 4. Event and Assignment Types
- **Event Management**: Practice, competition, meeting events
- **Assignment System**: Homework, projects, study assignments
- **Material Sharing**: Study guides, practice tests, resources
- **Recurring Events**: Support for recurring event patterns

## Technical Architecture

### Type Definitions
- **Interface-Based**: All types defined as TypeScript interfaces
- **Optional Properties**: Flexible optional property support
- **Union Types**: Strict union types for enums
- **Record Types**: Flexible configuration objects

### Database Integration
- **Schema Alignment**: Types align with database schema
- **Type Safety**: Compile-time type checking
- **Validation**: Runtime type validation support
- **Migration Support**: Type-safe database migrations

### API Integration
- **Request/Response Types**: API endpoint type definitions
- **Validation**: Input validation type support
- **Serialization**: JSON serialization type safety
- **Error Handling**: Type-safe error handling

## Development Guidelines

### Type Definition Standards
- **Consistent Naming**: PascalCase for interfaces
- **Clear Documentation**: Comprehensive JSDoc comments
- **Optional Properties**: Use optional properties for non-required fields
- **Union Types**: Use union types for enum-like values

### Database Schema Alignment
- **Schema First**: Types should match database schema
- **Migration Safety**: Types should support schema migrations
- **Version Control**: Track type changes with schema changes
- **Validation**: Runtime type validation where needed

### API Type Safety
- **Request Types**: Define types for API requests
- **Response Types**: Define types for API responses
- **Error Types**: Define types for API errors
- **Validation**: Use types for input validation

## Usage Examples

### Team Group Creation
```typescript
const newGroup: NewTeamGroup = {
  id: 'group-123',
  school: 'Example High School',
  division: 'C',
  slug: 'example-high-school',
  created_by: 'user-456',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

### Team Membership
```typescript
const membership: NewTeamMembership = {
  id: 'membership-789',
  user_id: 'user-123',
  team_id: 'team-456',
  role: 'member',
  status: 'active',
  joined_at: new Date().toISOString(),
  permissions: { canEdit: false, canDelete: false }
};
```

### Team Assignment
```typescript
const assignment: NewTeamAssignment = {
  id: 'assignment-101',
  team_id: 'team-456',
  created_by: 'user-123',
  title: 'Practice Test Assignment',
  description: 'Complete the practice test by Friday',
  assignment_type: 'homework',
  due_date: '2024-02-15T23:59:59Z',
  points: 100,
  is_published: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

## Dependencies

### Core Dependencies
- **TypeScript**: Type system and compilation
- **Database Schema**: Drizzle ORM schema definitions
- **API Types**: Request/response type definitions

### Development Dependencies
- **Type Checking**: TypeScript compiler
- **Linting**: ESLint with TypeScript support
- **Testing**: Type-safe testing utilities

---

*This documentation provides a comprehensive overview of the Scio.ly types system and database entity definitions.*

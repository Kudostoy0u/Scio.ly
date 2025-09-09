# Team Sharing System

This document describes the new team sharing functionality that allows team captains to share access codes with team members.

## Overview

The team sharing system enables:
- **Team Captains** to generate and share access codes
- **Team Members** to join teams using shared codes
- **Secure Access Control** with different permission levels
- **Database Persistence** for team data and sharing codes

## Features

### For Team Captains
- Generate captain codes (full access)
- Generate user codes (view-only access)
- Share codes with team members
- Codes expire after 24 hours for security

### For Team Members
- Join teams using shared codes
- Automatic permission assignment based on code type
- Access to team rosters and information

## Database Schema

### Teams Table
```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  school VARCHAR(255) NOT NULL,
  division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
  teams JSONB NOT NULL DEFAULT '[]',
  captain_code VARCHAR(255) UNIQUE NOT NULL,
  user_code VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Share Codes Table
```sql
CREATE TABLE share_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('captain', 'user')),
  school VARCHAR(255) NOT NULL,
  division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Initialize Database
Run the database initialization script to create the required tables:

```bash
pnpm run db:init
```

This will:
- Create the `teams` table
- Create the `share_codes` table
- Set up necessary indexes
- Verify the database connection

### 2. Database Connection
The system connects to the PostgreSQL database at:
```
postgresql://kundan:jTucKCVvP7D1cRbB8doSVg@scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

### 3. API Endpoints
The team sharing functionality is exposed through:
- `POST /api/teams/share` - Handle code generation and team joining

## Usage

### Sharing a Team
1. Navigate to the Teams page
2. Click the "Share" button (replaces the division badge)
3. Use the "Share Team" tab to:
   - Copy captain codes for full access
   - Copy user codes for view-only access
4. Share the codes with your team members

### Joining a Team
1. Click the "Share" button on any team page
2. Use the "Join Team" tab
3. Enter the shared code
4. The system will automatically:
   - Validate the code
   - Assign appropriate permissions
   - Load team data

## Security Features

- **Code Expiration**: All share codes expire after 24 hours
- **Permission Levels**: Different codes provide different access levels
- **Unique Codes**: Each code can only be used once
- **School/Division Isolation**: Codes are scoped to specific schools and divisions

## Technical Implementation

### Frontend Components
- `TeamShareModal` - Main sharing interface
- `TeamsDashboard` - Updated with share button

### Backend API
- `src/app/api/teams/share/route.ts` - API endpoint for sharing operations
- `src/lib/db/teams.ts` - Database operations and utilities

### Database Operations
- `saveTeamData()` - Save team information
- `loadTeamData()` - Load team data by school/division
- `loadTeamDataByCode()` - Load team data using share codes
- `createShareCode()` - Generate temporary share codes

## Future Enhancements

The system is designed to be flexible and can easily accommodate:
- Additional team metadata
- More granular permission levels
- Team member management
- Activity logging
- Advanced sharing options

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure the database is accessible and credentials are correct
2. **Code Expiration**: Codes expire after 24 hours - generate new ones if needed
3. **Permission Errors**: Verify you're using the correct code type for your needs

### Support
If you encounter issues:
1. Check the browser console for error messages
2. Verify the database connection using `pnpm run db:init`
3. Ensure all required tables are created successfully

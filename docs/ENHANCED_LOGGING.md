# Enhanced Developer Mode Logging

This document describes the enhanced logging system implemented for better debugging and development experience.

## Overview

The enhanced logging system provides structured, detailed logging specifically designed for developer mode. It includes:

- **Structured JSON logging** with timestamps and context
- **Request/Response logging** with body content and headers
- **Performance timing** for operations
- **Database operation logging** with queries and parameters
- **AI service logging** with request/response details
- **Enhanced error logging** with stack traces and context

## Enabling Developer Mode

### Option 1: Environment Variable
Set the `DEVELOPER_MODE` environment variable to `true`:

```bash
export DEVELOPER_MODE=true
```

### Option 2: Development Environment
Developer mode is automatically enabled when `NODE_ENV=development`.

## Usage Examples

### Basic Structured Logging
```typescript
import logger from '@/lib/utils/logger';

// Structured logging with context
logger.dev.structured('info', 'User authentication started', {
  userId: '123',
  method: 'oauth',
  provider: 'google'
});
```

### Request/Response Logging
```typescript
// Log incoming request
logger.dev.request('POST', '/api/report/remove', requestBody, headers);

// Log response
logger.dev.response(200, responseBody, 1500); // 1500ms timing
```

### Performance Timing
```typescript
const startTime = Date.now();
// ... perform operation ...
logger.dev.timing('Database query', startTime, { table: 'users', operation: 'SELECT' });
```

### Database Operations
```typescript
logger.dev.db('INSERT', 'users', 'INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
```

### AI Service Logging
```typescript
logger.dev.ai('Gemini', 'analyzeQuestion', requestData, responseData, 2500);
```

### Enhanced Error Logging
```typescript
try {
  // ... operation that might fail ...
} catch (error) {
  logger.dev.error('Operation failed', error, {
    userId: '123',
    operation: 'userUpdate',
    additionalContext: 'any relevant data'
  });
}
```

## Log Output Format

Developer mode logs are formatted as structured JSON with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "API Request: POST /api/report/remove",
  "context": {
    "method": "POST",
    "url": "/api/report/remove",
    "body": "{ \"question\": {...}, \"event\": \"Anatomy\" }",
    "headers": {
      "content-type": "application/json",
      "authorization": "[REDACTED]"
    }
  },
  "environment": "development"
}
```

## Security Features

- **Sensitive data masking**: Authorization headers and tokens are automatically redacted
- **Question text truncation**: Long question texts are truncated to prevent log bloat
- **Environment awareness**: Logs are only output in development/developer mode

## Performance Considerations

- Developer mode logging is disabled in production
- All logging operations are conditional and have minimal performance impact
- Structured logging uses efficient JSON serialization

## Integration with Existing Logging

The enhanced logging system extends the existing logger without breaking changes:

```typescript
// Existing logging still works
logger.info('Simple message');
logger.error('Error message');

// New developer mode logging
logger.dev.structured('info', 'Detailed message', { context: 'data' });
```

## Example: Report Remove API

The `/api/report/remove` endpoint now includes comprehensive logging:

1. **Request logging**: Full request details with masked sensitive data
2. **AI analysis logging**: Request/response to Gemini with timing
3. **Database operation logging**: All DB operations with queries and parameters
4. **Performance timing**: Total request time and individual operation times
5. **Error context**: Detailed error information with stack traces

This provides complete visibility into the API's behavior for debugging and optimization.

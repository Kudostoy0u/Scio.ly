# Chunked Testing System

## Overview

This project now includes a chunked testing system to avoid memory issues when running the full test suite. Instead of running all 68+ test files at once (which causes memory crashes), tests are organized into logical chunks and run sequentially.

## Quick Start

```bash
# Run all tests in chunks (recommended)
pnpm run test:chunks

# Run a specific chunk
pnpm run test:utils
pnpm run test:teams
pnpm run test:api

# Clean up test processes if needed
pnpm run test:cleanup
```

## Available Commands

### Main Commands
- `pnpm run test:chunks` - Run all test chunks sequentially
- `pnpm run test:list` - List all available chunks
- `pnpm run test:cleanup` - Clean up test processes and artifacts

### Individual Chunk Commands
- `pnpm run test:utils` - Utility functions and helpers
- `pnpm run test:app-core` - Core app functionality  
- `pnpm run test:api` - API routes and endpoints
- `pnpm run test:teams` - Teams functionality
- `pnpm run test:codebusters` - Codebusters features
- `pnpm run test:test-features` - Test and practice features
- `pnpm run test:unlimited` - Unlimited practice features

### Alternative Shell Script Commands
- `./scripts/test-chunks.sh all` - Run all chunks (shell version)
- `./scripts/test-chunks.sh chunk <name>` - Run specific chunk
- `./scripts/test-chunks.sh list` - List available chunks

## Test Chunks

| Chunk | Description | Test Files |
|-------|-------------|------------|
| **utils** | Utility functions and helpers | `src/lib/utils`, `src/lib/api`, `src/lib/services` |
| **app-core** | Core app functionality | `src/app/analytics`, `src/app/docs`, `src/app/plagiarism`, `src/app/practice`, `src/app/reports`, `src/app/robots.test.*` |
| **api** | API routes and endpoints | `src/app/api` |
| **teams** | Teams functionality | `src/app/teams` |
| **codebusters** | Codebusters features | `src/app/codebusters` |
| **test-features** | Test and practice features | `src/app/test` |
| **unlimited** | Unlimited practice features | `src/app/unlimited` |

## Memory Management

- Each chunk runs with 2GB memory limit (`NODE_OPTIONS="--max-old-space-size=2048"`)
- 2-second delay between chunks for memory cleanup
- Automatic cleanup of existing vitest processes before starting
- Sequential execution prevents memory buildup

## Benefits

1. **No More Memory Crashes**: Tests run in manageable chunks
2. **Faster Debugging**: Easier to identify which area has test failures
3. **Parallel Development**: Developers can run specific chunks relevant to their work
4. **CI/CD Friendly**: More reliable in continuous integration
5. **Better Resource Management**: Controlled memory usage

## Usage Examples

### Development Workflow
```bash
# Working on teams feature - run only teams tests
pnpm run test:teams

# Working on utilities - run only utils tests  
pnpm run test:utils

# Before committing - run all tests
pnpm run test:chunks
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Run Tests
  run: pnpm run test:chunks
```

### Debugging Failed Tests
```bash
# If a specific chunk fails, run it individually
pnpm run test:teams

# Clean up if tests get stuck
pnpm run test:cleanup
```

## File Structure

```
scripts/
├── test-chunks.js          # Main JavaScript test runner
├── test-chunks.sh          # Shell script alternative
├── cleanup-tests.sh        # Test cleanup utility
└── README.md              # Detailed documentation
```

## Troubleshooting

### If tests get stuck:
```bash
pnpm run test:cleanup
```

### If memory issues persist:
```bash
pnpm run test:cleanup:deep  # Deep cleanup including npm cache
```

### If a specific chunk fails:
1. Run that chunk individually: `pnpm run test:chunk <chunk-name>`
2. Check the specific test files in that chunk
3. The chunked runner stops at the first failure for easier debugging

## Migration from Old System

**Before:**
```bash
pnpm test  # Often crashed with memory issues
```

**After:**
```bash
pnpm run test:chunks  # Reliable, memory-efficient
```

The old `pnpm test` command still works but is not recommended for the full test suite due to memory issues.

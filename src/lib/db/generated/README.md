# Auto-Generated Database Schema

⚠️ **DO NOT EDIT FILES IN THIS DIRECTORY** ⚠️

This directory contains auto-generated files created by `drizzle-kit pull`.

## Files

- `schema.ts` - Database table definitions introspected from CockroachDB
- `relations.ts` - Table relationships
- `*.sql` - Migration files

## How to Update

To update the schema after database changes:

```bash
npx drizzle-kit pull
```

This will:
1. Connect to your CockroachDB instance
2. Introspect the current database schema
3. Generate/update the TypeScript schema files
4. Create migration files if needed

## Usage

Import from the parent schema file instead of directly from this directory:

```typescript
// ✅ Good
import { users, teams } from "@/lib/db/schema";

// ❌ Avoid
import { users } from "@/lib/db/generated/schema";
```

## Linting

These files are excluded from:
- TypeScript checking (tsconfig.json)
- Biome linting (biome.json)

This is intentional since they're auto-generated and may not match your code style.

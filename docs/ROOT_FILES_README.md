# Scio.ly Root-Level Files Documentation

## Overview

The root-level files in the Scio.ly project contain configuration files, build scripts, and project metadata. These files define the project structure, build processes, and development environment.

## Configuration Files

### Package Management

#### `package.json`
- **Purpose**: Node.js package configuration and dependencies
- **Key Features**:
  - **Project Metadata**: Name, version, description
  - **Scripts**: Development, build, test, and deployment scripts
  - **Dependencies**: Production and development dependencies
  - **Package Manager**: pnpm configuration
- **Scripts**:
  - `dev`: Development server with Turbopack
  - `build`: Production build with environment variables
  - `start`: Production server
  - `lint`: ESLint code quality checks
  - `test`: Vitest test runner
  - `test:ui`: Vitest UI interface
  - `typecheck`: TypeScript type checking
  - `db:generate`: Drizzle schema generation
  - `db:migrate`: Database migration execution
  - `db:studio`: Drizzle Studio interface
  - `db:init`: Database initialization
  - `analyze:long`: File analysis utilities

#### `pnpm-lock.yaml`
- **Purpose**: pnpm lock file for dependency version management
- **Features**: Exact dependency versions, integrity hashes
- **Benefits**: Reproducible builds, dependency resolution

### Build Configuration

#### `next.config.mjs`
- **Purpose**: Next.js configuration
- **Features**:
  - **Image Optimization**: Remote image patterns for Google and Supabase
  - **ESLint Configuration**: Build-time ESLint settings
  - **Performance**: Build optimization settings
- **Remote Patterns**:
  - Google user images (lh3.googleusercontent.com)
  - Supabase storage images (qzwdlqeicmcaoggdavdm.supabase.co)

#### `tsconfig.json`
- **Purpose**: TypeScript configuration
- **Features**:
  - **Target**: ES2017 for modern JavaScript features
  - **Strict Mode**: TypeScript strict type checking
  - **Path Mapping**: @/* alias for src directory
  - **Next.js Integration**: Next.js TypeScript plugin
  - **Exclusions**: Test files and configuration files excluded

#### `tailwind.config.ts`
- **Purpose**: Tailwind CSS configuration
- **Features**:
  - **Content Paths**: Source file patterns for CSS scanning
  - **Dark Mode**: Class-based dark mode support
  - **Custom Colors**: Regal blue and red color schemes
  - **Custom Fonts**: Poppins font family integration
  - **CSS Variables**: CSS custom properties support

### Testing Configuration

#### `vitest.config.ts`
- **Purpose**: Vitest testing framework configuration
- **Features**:
  - **Environment**: jsdom for browser simulation
  - **Setup Files**: Test setup and initialization
  - **Coverage**: Comprehensive test coverage reporting
  - **ESBuild**: JSX transformation configuration
  - **Path Resolution**: Source directory aliases
- **Coverage Settings**:
  - **Provider**: V8 coverage engine
  - **Reports**: Text, JSON, HTML, LCOV formats
  - **Thresholds**: 100% coverage requirements
  - **Exclusions**: Test files and utilities excluded

#### `vitest.setup.ts`
- **Purpose**: Vitest test setup and initialization
- **Features**: Test environment configuration, global setup

### Database Configuration

#### `drizzle.config.ts`
- **Purpose**: Drizzle ORM configuration
- **Features**:
  - **Schema Path**: Database schema definition location
  - **Output Directory**: Migration file output location
  - **Database Type**: PostgreSQL dialect configuration
  - **Credentials**: Database connection configuration
  - **Options**: Verbose logging and strict mode

### Linting and Code Quality

#### `eslint.config.mjs`
- **Purpose**: ESLint configuration for code quality
- **Features**: Code style enforcement, error detection

#### `postcss.config.mjs`
- **Purpose**: PostCSS configuration for CSS processing
- **Features**: CSS transformation and optimization

## Scripts Directory

### Database Scripts

#### `scripts/init-db.js`
- **Purpose**: Database initialization script
- **Features**:
  - **Connection Pool**: PostgreSQL connection management
  - **Table Creation**: Teams table creation and verification
  - **Constraint Management**: Unique constraint enforcement
  - **Error Handling**: Comprehensive error handling
  - **SSL Configuration**: Secure database connections

#### `scripts/apply-schema.sh`
- **Purpose**: Database schema application script
- **Features**: Schema deployment automation

#### `scripts/setup-teams-schema.sh`
- **Purpose**: Teams schema setup script
- **Features**: Team-specific schema initialization

#### `scripts/verify-setup.sh`
- **Purpose**: Database setup verification script
- **Features**: Setup validation and testing

### Analysis Scripts

#### `scripts/find-long-files.mjs`
- **Purpose**: File analysis utility
- **Features**: Long file detection and analysis
- **Output**: JSON and text format support

#### `scripts/find-long-files.ts`
- **Purpose**: TypeScript version of file analysis
- **Features**: Type-safe file analysis

### Utility Scripts

#### `scripts/caps.py`
- **Purpose**: Python utility script
- **Features**: Text processing utilities

#### `scripts/generate_words.py`
- **Purpose**: Word generation utility
- **Features**: Word list generation for the platform

#### `scripts/script.js`
- **Purpose**: JavaScript utility script
- **Features**: General utility functions

#### `scripts/test-database.js`
- **Purpose**: Database testing script
- **Features**: Database connection and functionality testing

#### `scripts/replace-console-client.mjs`
- **Purpose**: Console client replacement utility
- **Features**: Client code replacement automation

#### `scripts/fix-views.sql`
- **Purpose**: Database view fixes
- **Features**: View definition corrections

#### `scripts/unigram_freq.csv`
- **Purpose**: Unigram frequency data
- **Features**: Word frequency analysis data

## Migration Files

### Database Migrations (`/migrations/`)

#### Core Schema Migrations
- **`new_teams_schema.sql`**: New teams schema implementation
- **`new_teams_schema_cockroach.sql`**: CockroachDB teams schema
- **`user_profile_rework.sql`**: User profile system rework

#### Feature Additions
- **`add_base52_codes_table.sql`**: Base52 encoding table
- **`add_char_length_to_quotes.sql`**: Quote character length tracking
- **`add_deleted_status.sql`**: Soft delete functionality
- **`add_notifications.sql`**: Notification system
- **`add_roster_data.sql`**: Team roster data
- **`add_team_archiving.sql`**: Team archiving functionality
- **`add_team_units.sql`**: Team unit system
- **`add_v2_assignments_enhanced.sql`**: Enhanced assignments system

#### Performance Optimizations
- **`add_random_f_indexes.sql`**: Random function indexes
- **`add_leaderboard_stats_update.sql`**: Leaderboard statistics

#### Bug Fixes
- **`fix_archive_constraint.sql`**: Archive constraint fixes
- **`fix_create_leaderboard.sql`**: Leaderboard creation fixes
- **`leaderboard_complete_fix.sql`**: Complete leaderboard fixes
- **`leaderboard_fixes.sql`**: Leaderboard bug fixes
- **`leaderboard_simple_fix.sql`**: Simple leaderboard fixes
- **`leaderboard_updates.sql`**: Leaderboard updates

#### Data Management
- **`separate_long_quotes.sql`**: Long quotes separation
- **`remove_team_name_complete.sql`**: Team name removal
- **`remove_team_name.sql`**: Team name cleanup
- **`remove_user_entities_from_cockroach.sql`**: User entity cleanup

#### Refactoring Migrations (`/refactor/`)
- **`001_add_slug_to_team_units.sql`**: Team unit slug addition
- **`002_purge_legacy_share_tables.sql`**: Legacy table cleanup
- **`003_permissions_and_routines.sql`**: Permissions and routines
- **`004_backfill_team_units_slug.sql`**: Slug backfill
- **`005_enforce_slug_not_null.sql`**: Slug constraint enforcement
- **`006_team_groups.sql`**: Team groups implementation
- **`007_allow_multi_groups.sql`**: Multi-group support
- **`008_add_question_type_to_id_events.sql`**: Question type addition

#### Specialized Migrations
- **`create_avatars_bucket.sql`**: Avatar storage bucket creation
- **`leaderboard_rls_policies.sql`**: Row-level security policies

### Migration Documentation
- **`DB_MIGRATION.md`**: Database migration documentation
- **Migration Tracking**: Comprehensive migration history
- **Rollback Procedures**: Migration rollback strategies

## Drizzle Migrations (`/drizzle/`)

### Migration Files
- **`0000_mixed_loners.sql`**: Initial migration
- **`0000_thankful_korath.sql`**: Schema foundation
- **`0001_wealthy_puma.sql`**: Feature additions
- **`0002_little_storm.sql`**: Schema updates
- **`0003_sweet_yellowjacket.sql`**: Latest schema changes

### Migration Metadata
- **`meta/_journal.json`**: Migration journal
- **`meta/0000_snapshot.json`**: Initial schema snapshot
- **`meta/0001_snapshot.json`**: Schema version snapshots
- **`meta/0002_snapshot.json`**: Schema evolution tracking
- **`meta/0003_snapshot.json`**: Current schema state

## Project Documentation

### Core Documentation
- **`README.md`**: Project overview and setup instructions
- **`CLAUDE.md`**: AI assistant documentation
- **`LICENSE`**: Project license information

### Technical Documentation
- **`ARCHITECTURE.md`**: System architecture documentation
- **`REFACTORING_SUMMARY.md`**: Refactoring documentation
- **`SECURITY_IMPROVEMENTS.md`**: Security enhancements
- **`TEAMS_DATABASE_FIX.md`**: Database fix documentation
- **`TEAMS_ENHANCEMENTS_SUMMARY.md`**: Team feature enhancements
- **`TEAMS_ERROR_HANDLING_ARCHIVE_SUMMARY.md`**: Error handling documentation
- **`TEAMS_FIXES_SUMMARY.md`**: Team system fixes
- **`TEAMS_SOLUTION_SUMMARY.md`**: Team system solutions
- **`TEAMS_TESTS_SUMMARY.md`**: Team testing documentation
- **`TEAMS_UUID_SLUG_FIX.md`**: UUID and slug fixes
- **`TEAMS_V2_README.md`**: Team system version 2 documentation
- **`SUBTEAM_FUNCTIONALITY_SUMMARY.md`**: Subteam functionality
- **`TEAM_NAME_REMOVAL_SUMMARY.md`**: Team name removal documentation
- **`TEAM_SHARING.md`**: Team sharing functionality

### Reports and Analysis
- **`REPORT.txt`**: Project analysis report
- **`coverage/`**: Test coverage reports
- **`results/`**: Analysis results

## Environment Configuration

### Environment Variables
- **Database**: `DATABASE_URL` for PostgreSQL connection
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **AI Services**: `GEMINI_API_KEYS` for AI integration
- **Environment**: `NODE_ENV` for environment configuration

### Build Configuration
- **Next.js**: App Router configuration
- **TypeScript**: Strict type checking
- **Tailwind**: CSS framework configuration
- **Testing**: Comprehensive test coverage

## Development Workflow

### Setup Process
1. **Environment Setup**: Environment variable configuration
2. **Database Setup**: Database initialization and migration
3. **Dependency Installation**: Package installation via pnpm
4. **Development Server**: Local development server startup

### Build Process
1. **Type Checking**: TypeScript compilation
2. **Linting**: Code quality checks
3. **Testing**: Comprehensive test execution
4. **Build**: Production build generation

### Deployment Process
1. **Database Migration**: Schema updates
2. **Build Generation**: Production build
3. **Deployment**: Production deployment
4. **Verification**: Deployment verification

## Key Features

### 1. Modern Development Stack
- **Next.js 15**: Latest Next.js with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Vitest**: Modern testing framework

### 2. Database Management
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Primary database
- **CockroachDB**: Secondary database for teams
- **Migration System**: Comprehensive migration management

### 3. Testing Infrastructure
- **Comprehensive Coverage**: 100% test coverage requirements
- **Multiple Formats**: Text, JSON, HTML, LCOV reports
- **Test Utilities**: Custom testing utilities
- **Mock System**: Complete mocking infrastructure

### 4. Development Tools
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **File Analysis**: Long file detection and analysis

## Dependencies

### Core Dependencies
- **Next.js**: React framework
- **React**: UI library
- **TypeScript**: Type system
- **Tailwind CSS**: CSS framework

### Development Dependencies
- **Vitest**: Testing framework
- **ESLint**: Code linting
- **Drizzle Kit**: Database toolkit
- **PostCSS**: CSS processing

### Production Dependencies
- **Supabase**: Authentication and database
- **Google Gemini**: AI services
- **PostgreSQL**: Database
- **CockroachDB**: Secondary database

---

*This documentation provides a comprehensive overview of the Scio.ly root-level files and project configuration.*

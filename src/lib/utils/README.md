# Scio.ly Utilities Directory

`src/lib/utils` is organized by feature area. Each folder is dedicated to a part of the product so it is clear where to add or find helpers.

## Layout
- logging/ – platform logging (`logging/logger.ts`)
- teams/ – team authorization and helpers (`teams/access.ts`, `teams/resolver.ts`, `teams/hash.ts`, `teams/cache.ts`, `teams/errors.ts`)
- storage/ – client-side storage and caching (`storage/storage.ts`, `storage/localStorageCache.ts`, `storage/globalApiCache.ts`)
- content/ – text and profile helpers (`content/displayNameUtils.ts`, `content/string.ts`, `content/markdown.ts`)
- assessments/ – question and grading utilities (`assessments/base52.ts`, `assessments/eventConfig.ts`, `assessments/grade.ts`)
- network/ – request deduplication (`network/fetchOnce.ts`)
- auth/ – Supabase auth retries (`auth/supabaseRetry.ts`)
- media/ – image helpers (`media/preloadImage.ts`)

## Key Exports
- Teams: `getTeamAccess`, `hasLeadershipAccess`, `resolveTeamSlugToUnits`, `hashObject`, `teamCache`
- Storage: `StorageService`, `LocalStorageCache`, `globalApiCache`
- Content: `generateDisplayName`, `stripTrailingParenthetical`, `normalizeMath`, `slugifyText`, `extractToc`
- Assessments: `encodeBase52`, `decodeBase52`, `getEventCapabilities`, `getLetterGradeFromPercentage`
- Network/Auth/Media: `fetchOnce`, `withAuthRetry`, `preloadImage`

## Tests
Unit tests live beside their modules under each `__tests__` folder (e.g., `teams/__tests__/access.test.ts`, `assessments/base52.test.ts`, `network/fetchOnce.test.ts`).

## Conventions
- Prefer feature-scoped folders over dumping utilities at the root.
- Use the shared logger (`logging/logger.ts`) instead of `console.*`.
- Keep exports small and domain-specific; add new helpers next to their feature area.

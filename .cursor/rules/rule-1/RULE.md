---
alwaysApply: true
---
Welcome to our codebase, Scio.ly. This project uses Next.JS with Typescript, with Drizzle ORM + CockroachDB, Dexie.js with sessionstorage, and localstorage for caching (the former for our teams feature, the rest for everything else), and zod validation on everything. 

Here are some EXTREMELY IMPORTANT rules you must follow while making changes in this codebase:
* Always use camelCase for file naming
* Constantly think about what is bad practice. TS ignores, biome ignores, a quick fix to a config file to suppress errors that you don't like? Refrain from doing this, you need a robust, non-hacky codebase. Legacy code should always be purged, it is a sign of code smell. 
* Never use any types, and refrain from using unknown types. Use pnpm run lint and always make sure that it returns a code of 0 before ending.
* use and import the logger function instead of using console.log
* only run the test suite when explicitly asked, try to run specific tests suites as possible by referencing package.json
* always use drizzle ORM over raw sql. Always rely on src/lib/db as a single central source of truth for if you ever want to make schema changes, and use "pnpm run db:push" to sync those changes seamlessly.
* for lints use npx tsgo and pnpm run lint. Only run pnpm run build if i explicitly ask you to.
* use rgba for background dimming
* If you need to interact with the supabase database, use postgresql://postgres:alancaithegoat@db.qzwdIqeicmcaoggdavdm.supabase.co:5432/postgres
* Tests use vitest, not jest
* When you are running tests, make sure you run pkill -f "vitest" right after to prevent memory leaks. lastly, never run pnpm run build unless I explicitly ask you to. You must only run pnpm run lint after every code change, and run tests
-- Remove user-related tables from CockroachDB. Supabase owns user data.

BEGIN;

-- Drop in safe order; CASCADE to remove dependent objects if any
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.game_points CASCADE;
DROP TABLE IF EXISTS public.user_stats CASCADE;

COMMIT;



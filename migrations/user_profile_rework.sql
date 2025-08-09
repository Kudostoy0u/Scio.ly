-- User profile rework: simplify users table to first_name, last_name, username, email (+ metadata)
-- Idempotent-ish guards where possible

-- 1) Add new columns if not exist
DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2) Backfill username from email local-part where missing
UPDATE public.users
SET username = split_part(email, '@', 1)
WHERE (username IS NULL OR username = '');

-- 3) Backfill first_name/last_name from existing name/display_name if available
-- Prefer explicit display_name, then name
UPDATE public.users
SET first_name = COALESCE(
      NULLIF(split_part(display_name, ' ', 1), ''),
      NULLIF(split_part(name, ' ', 1), '')
    ),
    last_name = NULLIF(
      TRIM(BOTH FROM regexp_replace(COALESCE(display_name, name), '^\S+\s*', '')),
      ''
    )
WHERE (first_name IS NULL OR first_name = '')
  AND (display_name IS NOT NULL OR name IS NOT NULL);

-- 4) Enforce NOT NULL + uniqueness on username
ALTER TABLE public.users
  ALTER COLUMN username SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 5) Drop deprecated columns
DO $$ BEGIN
  ALTER TABLE public.users DROP COLUMN IF EXISTS navbar_style;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.users DROP COLUMN IF EXISTS has_unlocked_golden;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.users DROP COLUMN IF EXISTS has_unlocked_rainbow;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Optionally drop legacy name column if no longer used
-- DO $$ BEGIN
--   ALTER TABLE public.users DROP COLUMN IF EXISTS name;
-- EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- 6) Documentation
-- New users schema (selected columns):
-- id uuid PK, email text NOT NULL UNIQUE,
-- username text NOT NULL UNIQUE,
-- first_name text NULL, last_name text NULL,
-- display_name text NULL,
-- photo_url text NULL,
-- created_at timestamp NOT NULL DEFAULT now()



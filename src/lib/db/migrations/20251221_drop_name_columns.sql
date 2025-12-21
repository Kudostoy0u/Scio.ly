-- Migration: Clean up unused columns from users table
-- We now only use: id, email, username (unique handle), display_name (shown in UI), photo_url, created_at, updated_at, supabase_user_id, supabase_username
-- 
-- Run this migration against your CockroachDB database, then run:
-- npx drizzle-kit pull
-- to update the generated schema

-- Drop deprecated name columns
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;
ALTER TABLE users DROP COLUMN IF EXISTS name;

-- Drop unused phone columns
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;

-- Drop unused API key tracking column
ALTER TABLE users DROP COLUMN IF EXISTS has_generated_api_key;


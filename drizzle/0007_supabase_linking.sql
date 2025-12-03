-- Add Supabase linkage fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS supabase_user_id UUID,
ADD COLUMN IF NOT EXISTS supabase_username STRING;

-- Ensure uniqueness for mapping
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_supabase_user_id_unique UNIQUE (supabase_user_id);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_supabase_username_unique UNIQUE (supabase_username);

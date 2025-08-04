-- Complete leaderboard fixes - run this to fix all issues

-- First ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh (these won't error if they don't exist)
DO $$ 
BEGIN
    -- Drop leaderboard_members policies
    DROP POLICY IF EXISTS "Users can view their own leaderboard memberships" ON leaderboard_members;
    DROP POLICY IF EXISTS "Users can insert their own leaderboard memberships" ON leaderboard_members;
    DROP POLICY IF EXISTS "Users can update their own leaderboard stats" ON leaderboard_members;
    DROP POLICY IF EXISTS "Users can leave leaderboards" ON leaderboard_members;
    DROP POLICY IF EXISTS "View leaderboard members" ON leaderboard_members;
    DROP POLICY IF EXISTS "Insert through RPC only" ON leaderboard_members;
    DROP POLICY IF EXISTS "Update own stats" ON leaderboard_members;
    DROP POLICY IF EXISTS "Leave leaderboards" ON leaderboard_members;
    
    -- Drop leaderboards policies
    DROP POLICY IF EXISTS "Users can view active leaderboards" ON leaderboards;
    DROP POLICY IF EXISTS "Leaderboard creators can update their leaderboards" ON leaderboards;
    DROP POLICY IF EXISTS "Anyone can view active leaderboards" ON leaderboards;
    
    -- Drop leaderboard_snapshots policies
    DROP POLICY IF EXISTS "Users can view leaderboard history" ON leaderboard_snapshots;
    DROP POLICY IF EXISTS "View leaderboard history" ON leaderboard_snapshots;
    
    -- Drop users policies
    DROP POLICY IF EXISTS "Users can view display names" ON users;
    DROP POLICY IF EXISTS "Users can update their own display name" ON users;
END $$;

-- Create RLS policies for leaderboards table
CREATE POLICY "Anyone can view active leaderboards" ON leaderboards
    FOR SELECT USING (is_active = true);

CREATE POLICY "Leaderboard creators can update their leaderboards" ON leaderboards
    FOR UPDATE USING (auth.uid() = created_by);

-- Create RLS policies for leaderboard_members table
-- This policy allows all authenticated users to view leaderboard members
-- The actual filtering of which leaderboards they can see is handled by the leaderboards table policies
CREATE POLICY "View leaderboard members" ON leaderboard_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leaderboards 
            WHERE leaderboards.id = leaderboard_members.leaderboard_id
            AND leaderboards.is_active = true
        )
    );

-- Only allow inserts through RPC functions
CREATE POLICY "Insert through RPC only" ON leaderboard_members
    FOR INSERT WITH CHECK (false);

-- Users can update their own stats
CREATE POLICY "Update own stats" ON leaderboard_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can leave leaderboards (delete their membership)
CREATE POLICY "Leave leaderboards" ON leaderboard_members
    FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for leaderboard_snapshots
CREATE POLICY "View leaderboard history" ON leaderboard_snapshots
    FOR SELECT USING (
        leaderboard_id IN (
            SELECT leaderboard_id 
            FROM leaderboard_members
            WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for users table
CREATE POLICY "Users can view display names" ON users
    FOR SELECT USING (true);
    
CREATE POLICY "Users can update their own display name" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT ON leaderboards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leaderboard_members TO authenticated;
GRANT SELECT ON leaderboard_snapshots TO authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;

-- Create or replace the generate_join_code function if it doesn't exist
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to join public leaderboard
CREATE OR REPLACE FUNCTION join_public_leaderboard()
RETURNS UUID AS $$
DECLARE
    v_leaderboard_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user has display name
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND display_name IS NOT NULL 
        AND display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to join leaderboards';
    END IF;
    
    -- Find public leaderboard
    SELECT id INTO v_leaderboard_id
    FROM leaderboards
    WHERE is_public = true
    AND is_active = true
    LIMIT 1;
    
    IF v_leaderboard_id IS NULL THEN
        RAISE EXCEPTION 'No public leaderboard found';
    END IF;
    
    -- Insert or ignore if already member
    INSERT INTO leaderboard_members (leaderboard_id, user_id, questions_attempted, correct_answers)
    VALUES (v_leaderboard_id, v_user_id, 0, 0)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to join leaderboard by code
CREATE OR REPLACE FUNCTION join_leaderboard_by_code(p_join_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_leaderboard_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user has display name
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND display_name IS NOT NULL 
        AND display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to join leaderboards';
    END IF;
    
    -- Find leaderboard by code
    SELECT id INTO v_leaderboard_id
    FROM leaderboards
    WHERE join_code = p_join_code
    AND is_active = true
    AND is_public = false;
    
    IF v_leaderboard_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired join code';
    END IF;
    
    -- Insert or ignore if already member
    INSERT INTO leaderboard_members (leaderboard_id, user_id, questions_attempted, correct_answers)
    VALUES (v_leaderboard_id, v_user_id, 0, 0)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function if return type is different
DROP FUNCTION IF EXISTS create_private_leaderboard(TEXT, TEXT, TEXT);

-- Create function to create private leaderboard (returns table to match existing signature)
CREATE FUNCTION create_private_leaderboard(
    p_name TEXT,
    p_description TEXT,
    p_reset_frequency TEXT
) RETURNS TABLE(id UUID, join_code TEXT) AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_leaderboard_id UUID;
    v_join_code TEXT;
    v_attempts INT := 0;
BEGIN
    -- Check if user has display name
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND display_name IS NOT NULL 
        AND display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to create leaderboards';
    END IF;
    
    -- Generate unique join code
    LOOP
        v_join_code := generate_join_code();
        v_attempts := v_attempts + 1;
        
        -- Try to insert with this code
        BEGIN
            -- Create the leaderboard
            INSERT INTO leaderboards (
                name, 
                description, 
                is_public, 
                join_code,
                reset_frequency, 
                created_by
            ) VALUES (
                p_name, 
                p_description, 
                false, 
                v_join_code,
                p_reset_frequency, 
                v_user_id
            ) RETURNING id INTO v_leaderboard_id;
            
            -- If successful, break the loop
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            -- Code already exists, try again
            IF v_attempts > 10 THEN
                RAISE EXCEPTION 'Could not generate unique code';
            END IF;
        END;
    END LOOP;
    
    -- Automatically add creator as member
    INSERT INTO leaderboard_members (
        leaderboard_id, 
        user_id,
        questions_attempted,
        correct_answers
    ) VALUES (
        v_leaderboard_id, 
        v_user_id,
        0,
        0
    );
    
    -- Return the id and join_code as a table
    RETURN QUERY SELECT v_leaderboard_id, v_join_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace leave leaderboard function
CREATE OR REPLACE FUNCTION leave_leaderboard(p_leaderboard_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete user from leaderboard (stats will be removed due to CASCADE)
    DELETE FROM leaderboard_members
    WHERE leaderboard_id = p_leaderboard_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- Ensure the public leaderboard exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM leaderboards WHERE is_public = true) THEN
        INSERT INTO leaderboards (
            name,
            description,
            is_public,
            reset_frequency,
            created_by
        ) VALUES (
            'Public Monthly Leaderboard',
            'Open to all users - resets monthly',
            true,
            'month',
            auth.uid()
        );
    END IF;
END $$;
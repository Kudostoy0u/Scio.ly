-- Simplified leaderboard fix to avoid infinite recursion

-- First, ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop all policies on leaderboard_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'leaderboard_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON leaderboard_members', pol.policyname);
    END LOOP;
    
    -- Drop all policies on leaderboards
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'leaderboards' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON leaderboards', pol.policyname);
    END LOOP;
    
    -- Drop all policies on leaderboard_snapshots
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'leaderboard_snapshots' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON leaderboard_snapshots', pol.policyname);
    END LOOP;
    
    -- Drop all policies on users (related to display_name)
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' 
        AND (policyname LIKE '%display%' OR policyname LIKE '%view%names%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    END LOOP;
END $$;

-- Create simple, non-recursive policies

-- Leaderboards: Anyone can see active leaderboards
CREATE POLICY "view_active_leaderboards" ON leaderboards
    FOR SELECT USING (is_active = true);

-- Leaderboard members: Anyone authenticated can view members
-- We'll handle the filtering in the application layer to avoid recursion
CREATE POLICY "view_all_members" ON leaderboard_members
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow member operations through functions
CREATE POLICY "no_direct_insert" ON leaderboard_members
    FOR INSERT WITH CHECK (false);

CREATE POLICY "update_own_stats_only" ON leaderboard_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "delete_own_membership" ON leaderboard_members
    FOR DELETE USING (user_id = auth.uid());

-- Leaderboard snapshots: View if authenticated
CREATE POLICY "view_snapshots" ON leaderboard_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users: Everyone can view display names
CREATE POLICY "view_all_display_names" ON users
    FOR SELECT USING (true);

CREATE POLICY "update_own_display_name" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT ON leaderboards TO authenticated;
GRANT SELECT, UPDATE, DELETE ON leaderboard_members TO authenticated;
GRANT SELECT ON leaderboard_snapshots TO authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;

-- Recreate functions with SECURITY DEFINER to bypass RLS

-- Generate join code function
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

-- Join public leaderboard
CREATE OR REPLACE FUNCTION join_public_leaderboard()
RETURNS UUID AS $$
DECLARE
    v_leaderboard_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND display_name IS NOT NULL 
        AND display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to join leaderboards';
    END IF;
    
    SELECT id INTO v_leaderboard_id
    FROM leaderboards
    WHERE is_public = true
    AND is_active = true
    LIMIT 1;
    
    IF v_leaderboard_id IS NULL THEN
        RAISE EXCEPTION 'No public leaderboard found';
    END IF;
    
    INSERT INTO leaderboard_members (leaderboard_id, user_id, questions_attempted, correct_answers)
    VALUES (v_leaderboard_id, v_user_id, 0, 0)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join by code
CREATE OR REPLACE FUNCTION join_leaderboard_by_code(p_join_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_leaderboard_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND display_name IS NOT NULL 
        AND display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to join leaderboards';
    END IF;
    
    SELECT id INTO v_leaderboard_id
    FROM leaderboards
    WHERE join_code = p_join_code
    AND is_active = true
    AND is_public = false;
    
    IF v_leaderboard_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired join code';
    END IF;
    
    INSERT INTO leaderboard_members (leaderboard_id, user_id, questions_attempted, correct_answers)
    VALUES (v_leaderboard_id, v_user_id, 0, 0)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create private leaderboard
DROP FUNCTION IF EXISTS create_private_leaderboard(TEXT, TEXT, TEXT);

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
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND display_name IS NOT NULL 
        AND display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to create leaderboards';
    END IF;
    
    LOOP
        v_join_code := generate_join_code();
        v_attempts := v_attempts + 1;
        
        BEGIN
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
            
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            IF v_attempts > 10 THEN
                RAISE EXCEPTION 'Could not generate unique code';
            END IF;
        END;
    END LOOP;
    
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
    
    RETURN QUERY SELECT v_leaderboard_id, v_join_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave leaderboard
CREATE OR REPLACE FUNCTION leave_leaderboard(p_leaderboard_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM leaderboard_members
    WHERE leaderboard_id = p_leaderboard_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_leaderboard_members_user_id ON leaderboard_members(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_members_leaderboard_id ON leaderboard_members(leaderboard_id);

-- Ensure public leaderboard exists
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
            '00000000-0000-0000-0000-000000000000'::uuid  -- System user
        );
    END IF;
END $$;
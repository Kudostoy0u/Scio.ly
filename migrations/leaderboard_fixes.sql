-- First, drop all existing RLS policies on leaderboard tables to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own leaderboard memberships" ON leaderboard_members;
DROP POLICY IF EXISTS "Users can insert their own leaderboard memberships" ON leaderboard_members;
DROP POLICY IF EXISTS "Users can update their own leaderboard stats" ON leaderboard_members;
DROP POLICY IF EXISTS "Users can leave leaderboards" ON leaderboard_members;
DROP POLICY IF EXISTS "Users can view active leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Leaderboard creators can update their leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Users can view leaderboard history" ON leaderboard_snapshots;

-- Enable RLS on tables if not already enabled
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Create non-recursive RLS policies for leaderboards table
CREATE POLICY "Anyone can view active leaderboards" ON leaderboards
    FOR SELECT USING (is_active = true);

CREATE POLICY "Leaderboard creators can update their leaderboards" ON leaderboards
    FOR UPDATE USING (auth.uid() = created_by);

-- Create non-recursive RLS policies for leaderboard_members table
-- For SELECT: Users can view all members of leaderboards they are part of
CREATE POLICY "View leaderboard members" ON leaderboard_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leaderboard_members lm2
            WHERE lm2.leaderboard_id = leaderboard_members.leaderboard_id
            AND lm2.user_id = auth.uid()
        )
    );

-- For INSERT: Only through RPC functions
CREATE POLICY "Insert through RPC only" ON leaderboard_members
    FOR INSERT WITH CHECK (false);

-- For UPDATE: Users can update their own stats
CREATE POLICY "Update own stats" ON leaderboard_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- For DELETE: Users can leave leaderboards
CREATE POLICY "Leave leaderboards" ON leaderboard_members
    FOR DELETE USING (user_id = auth.uid());

-- Create non-recursive RLS policies for leaderboard_snapshots
CREATE POLICY "View leaderboard history" ON leaderboard_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM leaderboard_members
            WHERE leaderboard_members.leaderboard_id = leaderboard_snapshots.leaderboard_id
            AND leaderboard_members.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT ON leaderboards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leaderboard_members TO authenticated;
GRANT SELECT ON leaderboard_snapshots TO authenticated;

-- Fix the create_private_leaderboard function to use LOOP properly
CREATE OR REPLACE FUNCTION create_private_leaderboard(
    p_name TEXT,
    p_description TEXT,
    p_reset_frequency TEXT
) RETURNS UUID AS $$
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
    
    -- Automatically add creator as member using direct insert (bypasses RLS)
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
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update join functions to use SECURITY DEFINER properly
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
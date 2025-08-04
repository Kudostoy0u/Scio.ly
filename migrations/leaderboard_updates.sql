-- Add display_name to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create index for display name lookups
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- Update the update_leaderboard_stats function to handle leaving
CREATE OR REPLACE FUNCTION leave_leaderboard(p_leaderboard_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete user from leaderboard (stats will be removed due to CASCADE)
    DELETE FROM leaderboard_members
    WHERE leaderboard_id = p_leaderboard_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for users to delete their own membership
CREATE POLICY "Users can leave leaderboards" ON leaderboard_members
    FOR DELETE USING (auth.uid() = user_id);

-- Function to join public leaderboard (opt-in)
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
    INSERT INTO leaderboard_members (leaderboard_id, user_id)
    VALUES (v_leaderboard_id, v_user_id)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join leaderboard by code
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
    INSERT INTO leaderboard_members (leaderboard_id, user_id)
    VALUES (v_leaderboard_id, v_user_id)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create private leaderboard with code
CREATE OR REPLACE FUNCTION create_private_leaderboard(
    p_name TEXT,
    p_description TEXT,
    p_reset_frequency TEXT
)
RETURNS TABLE(id UUID, join_code TEXT) AS $$
DECLARE
    v_leaderboard_id UUID;
    v_join_code TEXT;
    v_attempts INT := 0;
BEGIN
    -- Generate unique join code
    LOOP
        v_join_code := generate_join_code();
        v_attempts := v_attempts + 1;
        
        -- Try to insert with this code
        BEGIN
            INSERT INTO leaderboards (name, description, is_public, join_code, reset_frequency, created_by)
            VALUES (p_name, p_description, false, v_join_code, p_reset_frequency, auth.uid())
            RETURNING id INTO v_leaderboard_id;
            
            -- Auto-join creator to their leaderboard
            INSERT INTO leaderboard_members (leaderboard_id, user_id)
            VALUES (v_leaderboard_id, auth.uid());
            
            RETURN QUERY SELECT v_leaderboard_id, v_join_code;
            RETURN;
        EXCEPTION WHEN unique_violation THEN
            -- Code already exists, try again
            IF v_attempts > 10 THEN
                RAISE EXCEPTION 'Could not generate unique code';
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a private leaderboard
CREATE OR REPLACE FUNCTION create_private_leaderboard(
    p_name TEXT,
    p_description TEXT,
    p_reset_frequency TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_leaderboard_id UUID;
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
    
    -- Create the leaderboard
    INSERT INTO leaderboards (
        name, 
        description, 
        is_public, 
        reset_frequency, 
        created_by
    ) VALUES (
        p_name, 
        p_description, 
        false, 
        p_reset_frequency, 
        v_user_id
    ) RETURNING id INTO v_leaderboard_id;
    
    -- Automatically add creator as member
    INSERT INTO leaderboard_members (
        leaderboard_id, 
        user_id
    ) VALUES (
        v_leaderboard_id, 
        v_user_id
    );
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join leaderboard by code
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
    INSERT INTO leaderboard_members (leaderboard_id, user_id)
    VALUES (v_leaderboard_id, v_user_id)
    ON CONFLICT (leaderboard_id, user_id) DO NOTHING;
    
    RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
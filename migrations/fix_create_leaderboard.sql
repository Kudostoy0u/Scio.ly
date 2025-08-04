-- Fix for create_private_leaderboard function
-- This addresses the ambiguous "id" error and ensures proper transaction handling

-- Drop the existing function
DROP FUNCTION IF EXISTS create_private_leaderboard(TEXT, TEXT, TEXT);

-- Recreate with fixed RETURNING clause and better error handling
CREATE FUNCTION create_private_leaderboard(
    p_name TEXT,
    p_description TEXT,
    p_reset_frequency TEXT
) RETURNS TABLE(id UUID, join_code TEXT) AS $$
DECLARE
    v_user_id UUID;
    v_leaderboard_id UUID;
    v_join_code TEXT;
    v_attempts INT := 0;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Check if user has display name
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = v_user_id 
        AND users.display_name IS NOT NULL 
        AND users.display_name != ''
    ) THEN
        RAISE EXCEPTION 'Display name required to create leaderboards';
    END IF;
    
    -- Generate unique join code with retry logic
    LOOP
        v_join_code := generate_join_code();
        v_attempts := v_attempts + 1;
        
        -- Try to insert the leaderboard
        BEGIN
            -- Insert the leaderboard
            INSERT INTO leaderboards (
                name, 
                description, 
                is_public, 
                join_code,
                reset_frequency, 
                created_by,
                is_active,
                created_at,
                next_reset_at
            ) VALUES (
                p_name, 
                p_description, 
                false, 
                v_join_code,
                p_reset_frequency, 
                v_user_id,
                true,
                NOW(),
                calculate_next_reset(NOW(), p_reset_frequency)
            ) RETURNING leaderboards.id INTO v_leaderboard_id;
            
            -- If we get here, the insert was successful
            EXIT;
        EXCEPTION 
            WHEN unique_violation THEN
                -- Join code already exists, try again
                IF v_attempts > 10 THEN
                    RAISE EXCEPTION 'Could not generate unique join code after 10 attempts';
                END IF;
                -- Continue to next iteration
            WHEN OTHERS THEN
                -- Re-raise any other errors
                RAISE;
        END;
    END LOOP;
    
    -- Now add the creator as a member
    BEGIN
        INSERT INTO leaderboard_members (
            leaderboard_id, 
            user_id,
            questions_attempted,
            correct_answers,
            joined_at,
            last_activity_at
        ) VALUES (
            v_leaderboard_id, 
            v_user_id,
            0,
            0,
            NOW(),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- If member insert fails, we should clean up the leaderboard
        DELETE FROM leaderboards WHERE leaderboards.id = v_leaderboard_id;
        RAISE EXCEPTION 'Failed to add creator as member: %', SQLERRM;
    END;
    
    -- Return the result
    RETURN QUERY 
    SELECT v_leaderboard_id AS id, v_join_code AS join_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure calculate_next_reset function exists
CREATE OR REPLACE FUNCTION calculate_next_reset(start_date TIMESTAMPTZ, frequency TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    CASE frequency
        WHEN 'week' THEN
            RETURN start_date + INTERVAL '1 week';
        WHEN 'month' THEN
            RETURN start_date + INTERVAL '1 month';
        WHEN '6month' THEN
            RETURN start_date + INTERVAL '6 months';
        WHEN 'year' THEN
            RETURN start_date + INTERVAL '1 year';
        WHEN 'never' THEN
            RETURN NULL;
        ELSE
            RETURN start_date + INTERVAL '1 month'; -- Default to monthly
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add any missing columns if they don't exist
DO $$
BEGIN
    -- Check if is_active column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaderboards' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaderboards' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Check if next_reset_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaderboards' 
        AND column_name = 'next_reset_at'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN next_reset_at TIMESTAMPTZ;
    END IF;
    
    -- Check if joined_at column exists in leaderboard_members
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaderboard_members' 
        AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE leaderboard_members ADD COLUMN joined_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Check if last_activity_at column exists in leaderboard_members
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaderboard_members' 
        AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE leaderboard_members ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;
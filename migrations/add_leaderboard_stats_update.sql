-- Function to update leaderboard stats when users answer questions
CREATE OR REPLACE FUNCTION update_leaderboard_stats(
    p_user_id UUID,
    p_questions_attempted INT,
    p_correct_answers INT
) RETURNS VOID AS $$
BEGIN
    -- Update stats for all leaderboards the user is a member of
    UPDATE leaderboard_members
    SET 
        questions_attempted = questions_attempted + p_questions_attempted,
        correct_answers = correct_answers + p_correct_answers,
        last_activity_at = NOW()
    WHERE user_id = p_user_id;
    
    -- The accuracy_percentage is a generated column, so it will update automatically
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_leaderboard_stats(UUID, INT, INT) TO authenticated;

-- Also ensure the accuracy_percentage column is properly set as generated
DO $$
BEGIN
    -- Check if accuracy_percentage is already a generated column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leaderboard_members' 
        AND column_name = 'accuracy_percentage'
        AND generation_expression IS NOT NULL
    ) THEN
        -- First drop the column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'leaderboard_members' 
            AND column_name = 'accuracy_percentage'
        ) THEN
            ALTER TABLE leaderboard_members DROP COLUMN accuracy_percentage;
        END IF;
        
        -- Add it as a generated column
        ALTER TABLE leaderboard_members 
        ADD COLUMN accuracy_percentage NUMERIC GENERATED ALWAYS AS (
            CASE 
                WHEN questions_attempted = 0 THEN 0
                ELSE ROUND((correct_answers::NUMERIC / questions_attempted::NUMERIC) * 100, 2)
            END
        ) STORED;
    END IF;
END $$;
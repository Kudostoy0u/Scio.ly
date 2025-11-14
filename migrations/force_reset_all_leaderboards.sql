-- =====================================================
-- FORCE RESET ALL LEADERBOARDS
-- This script manually resets all active leaderboards
-- and recalculates their next_reset_at times
-- =====================================================

-- Step 1: Archive current stats to snapshots for all active leaderboards
INSERT INTO leaderboard_snapshots (
    leaderboard_id, 
    user_id, 
    questions_attempted, 
    correct_answers, 
    accuracy_percentage, 
    reset_period_start, 
    reset_period_end
)
SELECT 
    lm.leaderboard_id, 
    lm.user_id, 
    lm.questions_attempted,
    lm.correct_answers, 
    lm.accuracy_percentage,
    l.last_reset_at, 
    NOW()
FROM leaderboard_members lm
JOIN leaderboards l ON l.id = lm.leaderboard_id
WHERE l.is_active = true
AND lm.questions_attempted > 0;

-- Step 2: Reset all member stats to zero
UPDATE leaderboard_members
SET questions_attempted = 0,
    correct_answers = 0,
    last_activity_at = NULL
WHERE leaderboard_id IN (
    SELECT id FROM leaderboards WHERE is_active = true
);

-- Step 3: Update all leaderboards' last_reset_at to NOW
-- and recalculate next_reset_at based on their frequency
UPDATE leaderboards
SET last_reset_at = NOW(),
    next_reset_at = calculate_next_reset(reset_frequency, NOW())
WHERE is_active = true
AND reset_frequency IS NOT NULL
AND reset_frequency != 'never';

-- Step 4: Verify the reset
SELECT 
    id,
    name,
    reset_frequency,
    last_reset_at,
    next_reset_at,
    is_active,
    is_public
FROM leaderboards
WHERE is_active = true
ORDER BY is_public DESC, name;

-- Show member counts after reset
SELECT 
    l.name,
    l.reset_frequency,
    COUNT(lm.user_id) as total_members,
    SUM(lm.questions_attempted) as total_questions_attempted,
    SUM(lm.correct_answers) as total_correct_answers
FROM leaderboards l
LEFT JOIN leaderboard_members lm ON l.id = lm.leaderboard_id
WHERE l.is_active = true
GROUP BY l.id, l.name, l.reset_frequency
ORDER BY l.is_public DESC, l.name;

-- Done! All active leaderboards have been reset.





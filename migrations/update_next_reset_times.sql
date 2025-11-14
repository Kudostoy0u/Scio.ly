-- =====================================================
-- UPDATE NEXT RESET TIMES FOR ALL LEADERBOARDS
-- This script updates next_reset_at to be properly 
-- calculated from NOW() based on each leaderboard's frequency
-- =====================================================

-- Update next_reset_at for all active leaderboards
-- This calculates the next reset time starting from NOW()
UPDATE leaderboards
SET next_reset_at = CASE reset_frequency
    WHEN 'week' THEN DATE_TRUNC('day', NOW() + INTERVAL '1 week')
    WHEN 'month' THEN DATE_TRUNC('day', NOW() + INTERVAL '1 month')
    WHEN '6month' THEN DATE_TRUNC('day', NOW() + INTERVAL '6 months')
    WHEN 'year' THEN DATE_TRUNC('day', NOW() + INTERVAL '1 year')
    WHEN 'never' THEN NULL
    ELSE NULL
END
WHERE is_active = true
AND reset_frequency IS NOT NULL;

-- Also update last_reset_at to NOW() if it's NULL or very old
UPDATE leaderboards
SET last_reset_at = NOW()
WHERE is_active = true
AND (last_reset_at IS NULL OR last_reset_at < NOW() - INTERVAL '1 year');

-- Verify the updates
SELECT 
    id,
    name,
    reset_frequency,
    last_reset_at,
    next_reset_at,
    CASE 
        WHEN next_reset_at IS NULL THEN 'Never resets'
        WHEN next_reset_at > NOW() THEN 'Future: ' || (next_reset_at - NOW())::text
        ELSE 'OVERDUE by ' || (NOW() - next_reset_at)::text
    END as status,
    is_active,
    is_public
FROM leaderboards
WHERE is_active = true
ORDER BY is_public DESC, next_reset_at ASC NULLS LAST;

-- Show summary
SELECT 
    reset_frequency,
    COUNT(*) as leaderboard_count,
    MIN(next_reset_at) as earliest_reset,
    MAX(next_reset_at) as latest_reset
FROM leaderboards
WHERE is_active = true
AND reset_frequency != 'never'
GROUP BY reset_frequency
ORDER BY 
    CASE reset_frequency
        WHEN 'week' THEN 1
        WHEN 'month' THEN 2
        WHEN '6month' THEN 3
        WHEN 'year' THEN 4
        ELSE 5
    END;

-- Done! All next_reset_at times have been updated.


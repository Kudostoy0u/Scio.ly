-- =====================================================
-- FIX LEADERBOARD AUTO-RESET AND ADD CRON JOB
-- Run this in Supabase SQL Editor
-- 
-- Special Rules:
-- - Public Monthly Leaderboard: Resets at midnight on last day of month
-- - All other leaderboards: Reset at midnight on their interval day
-- =====================================================

-- Step 1: Update calculate_next_reset to always reset at midnight
CREATE OR REPLACE FUNCTION calculate_next_reset(frequency text, from_date timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    next_date timestamptz;
BEGIN
    CASE frequency
        WHEN 'week' THEN
            -- Add 1 week, then truncate to midnight
            next_date := DATE_TRUNC('day', from_date + INTERVAL '1 week');
            RETURN next_date;
            
        WHEN 'month' THEN
            -- Add 1 month, then truncate to midnight
            next_date := DATE_TRUNC('day', from_date + INTERVAL '1 month');
            RETURN next_date;
            
        WHEN '6month' THEN
            -- Add 6 months, then truncate to midnight
            next_date := DATE_TRUNC('day', from_date + INTERVAL '6 months');
            RETURN next_date;
            
        WHEN 'year' THEN
            -- Add 1 year, then truncate to midnight
            next_date := DATE_TRUNC('day', from_date + INTERVAL '1 year');
            RETURN next_date;
            
        WHEN 'never' THEN
            RETURN NULL;
            
        ELSE
            RETURN NULL;
    END CASE;
END;
$$;

-- Also update the overload with reversed parameters
CREATE OR REPLACE FUNCTION calculate_next_reset(start_date timestamptz, frequency text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN calculate_next_reset(frequency, start_date);
END;
$$;

-- Step 2: Fix reset_leaderboard to update next_reset_at
CREATE OR REPLACE FUNCTION reset_leaderboard(p_leaderboard_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Archive current stats to snapshots
    INSERT INTO leaderboard_snapshots (
        leaderboard_id, user_id, questions_attempted, 
        correct_answers, accuracy_percentage, 
        reset_period_start, reset_period_end
    )
    SELECT 
        lm.leaderboard_id, lm.user_id, lm.questions_attempted,
        lm.correct_answers, lm.accuracy_percentage,
        l.last_reset_at, NOW()
    FROM leaderboard_members lm
    JOIN leaderboards l ON l.id = lm.leaderboard_id
    WHERE lm.leaderboard_id = p_leaderboard_id
    AND lm.questions_attempted > 0;

    -- Reset member stats
    UPDATE leaderboard_members
    SET questions_attempted = 0,
        correct_answers = 0,
        last_activity_at = NULL
    WHERE leaderboard_id = p_leaderboard_id;

    -- Update leaderboard reset times
    -- This will trigger the update_next_reset_at trigger to recalculate next_reset_at
    UPDATE leaderboards
    SET last_reset_at = NOW()
    WHERE id = p_leaderboard_id;
END;
$$;

-- Step 3: Create auto-reset function with special handling for Public Monthly Leaderboard
CREATE OR REPLACE FUNCTION auto_reset_expired_leaderboards()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_leaderboard RECORD;
    v_count INTEGER := 0;
    v_is_last_day_of_month BOOLEAN;
BEGIN
    -- Check if today is the last day of the month
    -- Compare tomorrow's month with today's month
    v_is_last_day_of_month := (
        EXTRACT(MONTH FROM (NOW() + INTERVAL '1 day')) != EXTRACT(MONTH FROM NOW())
    );
    
    -- Find all leaderboards that need to be reset
    FOR v_leaderboard IN 
        SELECT id, name, next_reset_at, reset_frequency, is_public
        FROM leaderboards
        WHERE is_active = true
        AND next_reset_at IS NOT NULL
        AND reset_frequency IS NOT NULL
        AND reset_frequency != 'never'
        AND next_reset_at <= NOW()
        ORDER BY next_reset_at ASC
    LOOP
        BEGIN
            -- Special handling for Public Monthly Leaderboard
            -- Only reset at midnight on the last day of the month
            IF LOWER(v_leaderboard.name) = 'public monthly leaderboard' AND v_leaderboard.is_public = true THEN
                -- Only reset if it's the last day of the month
                IF v_is_last_day_of_month THEN
                    PERFORM reset_leaderboard(v_leaderboard.id);
                    v_count := v_count + 1;
                    RAISE NOTICE 'Reset PUBLIC leaderboard: % (ID: %) on last day of month', 
                        v_leaderboard.name, 
                        v_leaderboard.id;
                ELSE
                    -- Skip this reset, will try again tomorrow
                    RAISE NOTICE 'Skipping PUBLIC leaderboard reset (not last day of month): %', 
                        v_leaderboard.name;
                    CONTINUE;
                END IF;
            ELSE
                -- Regular leaderboards: reset immediately when overdue
                PERFORM reset_leaderboard(v_leaderboard.id);
                v_count := v_count + 1;
                RAISE NOTICE 'Reset leaderboard: % (ID: %)', 
                    v_leaderboard.name, 
                    v_leaderboard.id;
            END IF;
                
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other leaderboards
            RAISE WARNING 'Failed to reset leaderboard % (ID: %): %', 
                v_leaderboard.name, 
                v_leaderboard.id, 
                SQLERRM;
        END;
    END LOOP;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Auto-reset complete: % leaderboard(s) reset', v_count;
    ELSE
        RAISE NOTICE 'No leaderboards needed reset';
    END IF;
END;
$$;

-- Step 4: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 5: Remove any existing cron job with the same name
SELECT cron.unschedule('auto-reset-leaderboards') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'auto-reset-leaderboards'
);

-- Step 6: Create cron job starting November 1st, 2025
-- Schedule: Daily at midnight (00:00)
-- Note: pg_cron will start running this on Nov 1, 2025 at midnight and every day after
-- The function handles special timing for "Public Monthly Leaderboard" (last day of month only)
SELECT cron.schedule(
    'auto-reset-leaderboards',                     -- Job name
    '0 0 * * *',                                   -- At midnight every day
    $$SELECT auto_reset_expired_leaderboards()$$   -- Command to run
);

-- Step 7: Configure the cron job
UPDATE cron.job 
SET database = current_database(),
    username = 'postgres'
WHERE jobname = 'auto-reset-leaderboards';

-- Step 8: Update all existing leaderboards to reset at midnight
-- This recalculates next_reset_at for all active leaderboards with the new midnight logic
UPDATE leaderboards
SET next_reset_at = calculate_next_reset(reset_frequency, last_reset_at)
WHERE reset_frequency IS NOT NULL
AND reset_frequency != 'never'
AND is_active = true;

-- Done! Verify the cron job was created:
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    database
FROM cron.job 
WHERE jobname = 'auto-reset-leaderboards';


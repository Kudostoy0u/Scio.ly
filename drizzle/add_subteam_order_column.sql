-- Migration: Add display_order column to new_team_units table for subteam ordering
-- This allows users to drag and rearrange subteams
-- Compatible with CockroachDB
-- 
-- INSTRUCTIONS: Run each statement one at a time. If Step 1 fails with "column already exists", skip it.

-- Step 1: Add the display_order column
-- If you get error "column display_order already exists", that's fine - skip to Step 2
ALTER TABLE new_team_units ADD COLUMN display_order BIGINT DEFAULT 0;

-- Step 2: Set initial order values based on creation time (oldest first)
-- This ensures existing subteams have a consistent order
-- Only update rows where display_order is still 0 (default) to avoid overwriting existing orders
UPDATE new_team_units
SET display_order = subquery.row_num - 1
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at ASC) as row_num
  FROM new_team_units
) AS subquery
WHERE new_team_units.id = subquery.id 
  AND COALESCE(new_team_units.display_order, 0) = 0;

-- Step 3: Create an index for better query performance when ordering
CREATE INDEX IF NOT EXISTS idx_new_team_units_group_display_order 
ON new_team_units(group_id, display_order);


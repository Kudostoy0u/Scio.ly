-- Add start_date and end_date fields to recurring meetings
ALTER TABLE new_team_recurring_meetings 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- Add comments for clarity
COMMENT ON COLUMN new_team_recurring_meetings.start_date IS 'Start date for the recurring meeting series (YYYY-MM-DD format)';
COMMENT ON COLUMN new_team_recurring_meetings.end_date IS 'End date for the recurring meeting series (YYYY-MM-DD format). NULL means no end date.';

-- Add indexes for better performance on date queries
CREATE INDEX idx_recurring_meetings_start_date ON new_team_recurring_meetings(start_date);
CREATE INDEX idx_recurring_meetings_end_date ON new_team_recurring_meetings(end_date);

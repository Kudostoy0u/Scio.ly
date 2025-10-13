-- Add image_data column to new_team_assignment_questions table
-- This allows storing image URLs for questions that have images

ALTER TABLE new_team_assignment_questions 
ADD COLUMN IF NOT EXISTS image_data TEXT;

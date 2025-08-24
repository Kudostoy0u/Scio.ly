-- Migration: Separate long quotes from main quotes table
-- This migration moves quotes longer than 120 characters to a separate table
-- to improve the quality of quote selection for codebusters

-- First, drop the existing constraint if it exists
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_char_length_check;

-- Then, populate the char_length column with actual character counts
UPDATE quotes 
SET char_length = LENGTH(quote)
WHERE char_length IS NULL;

-- Create longquotes table with same structure as quotes table
CREATE TABLE longquotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author TEXT NOT NULL,
    quote TEXT NOT NULL,
    language TEXT NOT NULL,
    char_length INTEGER NOT NULL,
    random_f DOUBLE PRECISION NOT NULL DEFAULT random(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for the longquotes table (matching quotes table)
CREATE INDEX idx_longquotes_language ON longquotes(language);
CREATE INDEX idx_longquotes_char_length ON longquotes(char_length);
CREATE INDEX idx_longquotes_language_char_length ON longquotes(language, char_length);
CREATE INDEX idx_longquotes_random_f ON longquotes(random_f);

-- Add a comment to document the purpose of this table
COMMENT ON TABLE longquotes IS 'Storage for quotes longer than 120 characters, separated from main quotes table for better codebusters quote selection';

-- Insert quotes longer than 120 characters into longquotes table
INSERT INTO longquotes (id, author, quote, language, char_length, random_f, created_at)
SELECT id, author, quote, language, char_length, random_f, created_at
FROM quotes
WHERE char_length > 120;

-- Delete quotes longer than 120 characters from the main quotes table
DELETE FROM quotes
WHERE char_length > 120;

-- Add a check constraint to prevent long quotes from being added to main table in the future
-- Only add this constraint after we've moved all long quotes out
ALTER TABLE quotes ADD CONSTRAINT quotes_char_length_check CHECK (char_length <= 120);

-- Show statistics of the migration
SELECT 
    'Main quotes table' as table_name,
    COUNT(*) as quote_count,
    MIN(char_length) as min_length,
    MAX(char_length) as max_length,
    AVG(char_length)::NUMERIC(5,2) as avg_length
FROM quotes
UNION ALL
SELECT 
    'Long quotes table' as table_name,
    COUNT(*) as quote_count,
    MIN(char_length) as min_length,
    MAX(char_length) as max_length,
    AVG(char_length)::NUMERIC(5,2) as avg_length
FROM longquotes
ORDER BY table_name;

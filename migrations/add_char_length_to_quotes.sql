-- Migration: Add character length column to quotes table
-- This migration adds a char_length column to track the number of characters in each quote
-- and creates indexes for efficient filtering by character length

-- Add character length column to quotes table
ALTER TABLE quotes ADD COLUMN char_length INTEGER;

-- Update existing quotes with their character lengths
UPDATE quotes SET char_length = LENGTH(quote);

-- Make the column NOT NULL after populating it
ALTER TABLE quotes ALTER COLUMN char_length SET NOT NULL;

-- Add an index for efficient filtering by character length
CREATE INDEX idx_quotes_char_length ON quotes(char_length);

-- Add a composite index for efficient filtering by language and character length
CREATE INDEX idx_quotes_language_char_length ON quotes(language, char_length);

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN quotes.char_length IS 'Number of characters in the quote, used for normal distribution-based quote selection';

-- Add base52_codes table for efficient question lookups
-- This table stores 5-character base52 codes for questions to enable fast lookups
-- The code format is CXYZD where D is S (standard) or P (picture)
-- Collision handling is implemented in the application layer to ensure uniqueness
CREATE TABLE IF NOT EXISTS base52_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(5) NOT NULL UNIQUE,
  question_id UUID NOT NULL,
  table_name VARCHAR(20) NOT NULL CHECK (table_name IN ('questions', 'idEvents')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS base52_codes_code_idx ON base52_codes (code);
CREATE INDEX IF NOT EXISTS base52_codes_question_table_idx ON base52_codes (question_id, table_name);

-- Add unique constraints to prevent duplicate codes and question mappings
ALTER TABLE base52_codes ADD CONSTRAINT base52_codes_unique_code UNIQUE (code);
ALTER TABLE base52_codes ADD CONSTRAINT base52_codes_unique_question UNIQUE (question_id, table_name);

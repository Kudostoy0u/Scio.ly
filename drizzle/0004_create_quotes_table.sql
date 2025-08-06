-- Create quotes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author" text NOT NULL,
	"quote" text NOT NULL,
	"language" text NOT NULL,
	"created_at" timestamp DEFAULT now()
); 
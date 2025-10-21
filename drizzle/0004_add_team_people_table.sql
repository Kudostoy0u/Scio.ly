CREATE TABLE "new_team_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_unit_id" uuid NOT NULL,
	"name" text NOT NULL,
	"user_id" uuid,
	"is_admin" text DEFAULT 'false',
	"events" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "new_team_people" ADD CONSTRAINT "new_team_people_team_unit_id_new_team_units_id_fk" FOREIGN KEY ("team_unit_id") REFERENCES "new_team_units"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "new_team_people" ADD CONSTRAINT "new_team_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

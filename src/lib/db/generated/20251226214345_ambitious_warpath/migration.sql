-- Tournament roster versions (minimal migration)
CREATE TABLE IF NOT EXISTS "team_tournament_rosters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"team_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'inactive' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	"archived_at" timestamptz
);
--> statement-breakpoint
ALTER TABLE "team_roster"
	ADD COLUMN IF NOT EXISTS "tournament_roster_id" uuid;
--> statement-breakpoint
INSERT INTO "team_tournament_rosters" ("id", "team_id", "name", "status", "created_by", "created_at", "updated_at")
SELECT
	gen_random_uuid(),
	teams.id,
	'Tournament 1',
	'active',
	(
		SELECT team_memberships.user_id
		FROM team_memberships
		WHERE team_memberships.team_id = teams.id
		ORDER BY team_memberships.joined_at
		LIMIT 1
	),
	now(),
	now()
FROM teams
WHERE EXISTS (
	SELECT 1
	FROM team_memberships
	WHERE team_memberships.team_id = teams.id
)
AND NOT EXISTS (
	SELECT 1
	FROM team_tournament_rosters
	WHERE team_tournament_rosters.team_id = teams.id
		AND team_tournament_rosters.status = 'active'
);
--> statement-breakpoint
UPDATE "team_roster"
SET "tournament_roster_id" = (
	SELECT team_tournament_rosters.id
	FROM team_tournament_rosters
	WHERE team_tournament_rosters.team_id = team_roster.team_id
		AND team_tournament_rosters.status = 'active'
	LIMIT 1
)
WHERE "tournament_roster_id" IS NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "team_roster_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_roster_unique" ON "team_roster" (
	"team_id",
	"subteam_id",
	"tournament_roster_id",
	"event_name",
	"slot_index"
);

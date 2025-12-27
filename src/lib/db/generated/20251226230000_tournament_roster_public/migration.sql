ALTER TABLE "team_tournament_rosters"
	ADD COLUMN IF NOT EXISTS "is_public" bool DEFAULT false;

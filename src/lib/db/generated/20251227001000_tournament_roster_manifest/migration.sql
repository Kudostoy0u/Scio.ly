ALTER TABLE "team_cache_manifests"
	ADD COLUMN IF NOT EXISTS "tournament_rosters_updated_at" timestamptz DEFAULT now() NOT NULL;

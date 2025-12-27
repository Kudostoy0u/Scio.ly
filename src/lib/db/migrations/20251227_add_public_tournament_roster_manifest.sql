ALTER TABLE team_cache_manifests
  ADD COLUMN IF NOT EXISTS public_tournament_rosters_updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

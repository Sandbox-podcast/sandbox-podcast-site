CREATE TABLE badge_awards (
  id text PRIMARY KEY,
  award_type text NOT NULL CHECK (award_type = 'rising-star'),
  week text NOT NULL CHECK (week ~ '^20\d{2}-W(0[1-9]|[1-4]\d|5[0-3])$'),
  entity_id text NOT NULL REFERENCES chart_entities(id),
  github_id double precision NOT NULL CHECK (github_id > 0 AND github_id = trunc(github_id)),
  project_name text NOT NULL,
  edition_id text NOT NULL REFERENCES weekly_chart_editions(id),
  rank integer NOT NULL CHECK (rank = 1),
  score double precision NOT NULL CHECK (score BETWEEN 0 AND 100),
  rule_version text NOT NULL CHECK (rule_version = 'rising-sunday-v1'),
  evidence jsonb NOT NULL,
  evidence_hash text NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  assigned_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX badge_awards_type_week_idx ON badge_awards(award_type, week);
CREATE INDEX badge_awards_project_idx ON badge_awards(github_id);
--> statement-breakpoint
CREATE TABLE badge_award_withdrawals (
  award_id text PRIMARY KEY REFERENCES badge_awards(id),
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 10 AND 1000),
  actor text NOT NULL CHECK (length(trim(actor)) BETWEEN 1 AND 100),
  withdrawn_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TRIGGER badge_awards_immutable BEFORE UPDATE OR DELETE ON badge_awards FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
CREATE TRIGGER badge_award_withdrawals_immutable BEFORE UPDATE OR DELETE ON badge_award_withdrawals FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
--> statement-breakpoint
CREATE FUNCTION badges_verify_award_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source weekly_chart_editions; position weekly_rankings; repo github_projects;
BEGIN
  SELECT * INTO source FROM weekly_chart_editions WHERE id = NEW.edition_id;
  IF source.chart_type <> 'rising' OR source.published_at IS NULL OR source.published_at > NEW.assigned_at
    OR source.scoring_version <> 'rising-cross-source-v2' OR source.payload->>'provenance' <> 'auto'
    OR source.week !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Award requires a published Rising daily edition';
  END IF;
  IF extract(isodow FROM source.week::date) <> 7
    OR to_char(source.week::date, 'IYYY-"W"IW') <> NEW.week
    OR (NEW.assigned_at AT TIME ZONE 'Europe/Paris')::date <= source.week::date THEN
    RAISE EXCEPTION 'Award requires the closed ISO week in Europe/Paris';
  END IF;
  SELECT * INTO position FROM weekly_rankings WHERE edition_id = NEW.edition_id AND entity_id = NEW.entity_id;
  SELECT * INTO repo FROM github_projects WHERE entity_id = NEW.entity_id;
  IF position.id IS NULL OR position.rank <> 1 OR position.score <> NEW.score OR repo.github_id IS DISTINCT FROM NEW.github_id THEN
    RAISE EXCEPTION 'Award must match the official winner and GitHub identity';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER badge_awards_verified BEFORE INSERT ON badge_awards FOR EACH ROW EXECUTE FUNCTION badges_verify_award_source();

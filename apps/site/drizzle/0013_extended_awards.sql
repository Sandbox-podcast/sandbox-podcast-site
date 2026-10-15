-- Extension additive du modèle d'attribution. Les preuves et les lignes existantes ne sont pas réécrites.
-- La colonne week et son index restent utilisables par le code Rising Star existant.
ALTER TABLE badge_awards ALTER COLUMN week DROP NOT NULL;
ALTER TABLE badge_awards ADD COLUMN extended_period text;
ALTER TABLE badge_awards ADD COLUMN period text GENERATED ALWAYS AS (COALESCE(week, extended_period)) STORED;
ALTER TABLE badge_awards ALTER COLUMN period SET NOT NULL;
ALTER TABLE badge_awards ADD COLUMN period_kind text NOT NULL DEFAULT 'week';
ALTER TABLE badge_awards ADD COLUMN scope text NOT NULL DEFAULT '';
ALTER TABLE badge_awards ADD COLUMN chart_type text NOT NULL DEFAULT 'rising' REFERENCES ranking_collections(collection_key);
ALTER TABLE badge_awards ALTER COLUMN github_id DROP NOT NULL;
ALTER TABLE badge_awards DROP CONSTRAINT badge_awards_award_type_check;
ALTER TABLE badge_awards DROP CONSTRAINT badge_awards_rank_check;
ALTER TABLE badge_awards DROP CONSTRAINT badge_awards_rule_version_check;
--> statement-breakpoint
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_type_check CHECK (award_type IN ('rising-star','github-category','biggest-mover','rookie-month','skill-week','best-model','annual'));
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_period_check CHECK (
  (award_type IN ('rising-star','github-category','biggest-mover','skill-week','best-model') AND period_kind = 'week' AND period ~ '^20\d{2}-W(0[1-9]|[1-4]\d|5[0-3])$')
  OR (award_type = 'rookie-month' AND period_kind = 'month' AND period ~ '^20\d{2}-(0[1-9]|1[0-2])$')
  OR (award_type = 'annual' AND period_kind = 'year' AND period ~ '^20\d{2}$')
);
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_period_storage_check CHECK (
  (award_type = 'rising-star' AND week IS NOT NULL AND extended_period IS NULL)
  OR (award_type <> 'rising-star' AND week IS NULL AND extended_period IS NOT NULL)
);
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_scope_check CHECK (
  (award_type = 'github-category' AND scope IN ('agents','coding','mcp','llm','rag','research','image','video','voice','infrastructure','data','local-ai','other'))
  OR (award_type = 'annual' AND scope IN ('github','rising','skills','models') AND scope = chart_type)
  OR (award_type NOT IN ('github-category','annual') AND scope = '')
);
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_chart_check CHECK (
  (award_type IN ('rising-star','rookie-month') AND chart_type = 'rising')
  OR (award_type IN ('github-category','biggest-mover') AND chart_type = 'github')
  OR (award_type = 'skill-week' AND chart_type = 'skills')
  OR (award_type = 'best-model' AND chart_type = 'models')
  OR (award_type = 'annual' AND chart_type IN ('github','rising','skills','models'))
);
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_identity_check CHECK (chart_type NOT IN ('github','rising') OR github_id IS NOT NULL);
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_position_check CHECK (rank BETWEEN 1 AND 100);
ALTER TABLE badge_awards ADD CONSTRAINT badge_awards_rule_check CHECK (rule_version = CASE award_type
  WHEN 'rising-star' THEN 'rising-sunday-v1' WHEN 'github-category' THEN 'category-sunday-v1'
  WHEN 'biggest-mover' THEN 'mover-sunday-v1' WHEN 'rookie-month' THEN 'rookie-month-v1'
  WHEN 'skill-week' THEN 'skill-sunday-v1' WHEN 'best-model' THEN 'model-sunday-v1'
  WHEN 'annual' THEN 'annual-first-places-v1' END);
--> statement-breakpoint
CREATE UNIQUE INDEX badge_awards_type_period_scope_idx ON badge_awards(award_type, period, scope);
CREATE INDEX badge_awards_entity_idx ON badge_awards(entity_id);
CREATE INDEX badge_awards_history_idx ON badge_awards(assigned_at DESC, id DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION badges_verify_award_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  source weekly_chart_editions; position weekly_rankings; repo github_projects;
  prior weekly_chart_editions; prior_position weekly_rankings;
  source_day date; assigned_day date; start_day date; end_day date;
  expected integer; covered integer; selected_entity text; selected_count integer;
  last_source text; source_ids jsonb;
  period_value text;
BEGIN
  -- Les colonnes générées sont calculées après les triggers BEFORE INSERT.
  period_value := COALESCE(NEW.week, NEW.extended_period);
  SELECT * INTO source FROM weekly_chart_editions WHERE id = NEW.edition_id;
  IF source.id IS NULL OR source.chart_type <> NEW.chart_type OR source.published_at IS NULL
    OR source.published_at > NEW.assigned_at OR source.scoring_version <> NEW.chart_type || '-cross-source-v2'
    OR source.payload->>'provenance' IS DISTINCT FROM 'auto' OR source.week !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Award requires an official published corroborated daily edition';
  END IF;
  IF EXISTS (SELECT 1 FROM badge_awards a JOIN badge_award_withdrawals w ON w.award_id = a.id WHERE a.edition_id = NEW.edition_id) THEN
    RAISE EXCEPTION 'Award source has a recorded withdrawal';
  END IF;
  source_day := source.week::date;
  assigned_day := (NEW.assigned_at AT TIME ZONE 'Europe/Paris')::date;
  IF extract(isodow FROM source_day) <> 7 THEN RAISE EXCEPTION 'Award requires a Sunday edition'; END IF;
  SELECT * INTO position FROM weekly_rankings WHERE edition_id = NEW.edition_id AND entity_id = NEW.entity_id;
  IF position.id IS NULL OR position.rank <> NEW.rank OR position.score <> NEW.score THEN
    RAISE EXCEPTION 'Award must match an official position and score';
  END IF;
  IF NEW.chart_type IN ('github','rising') THEN
    SELECT * INTO repo FROM github_projects WHERE entity_id = NEW.entity_id;
    IF repo.id IS NULL OR repo.github_id IS DISTINCT FROM NEW.github_id THEN
      RAISE EXCEPTION 'Award must match the stable GitHub identity';
    END IF;
  END IF;
  IF NEW.period_kind = 'week' THEN
    IF to_char(source_day, 'IYYY-"W"IW') <> period_value OR assigned_day <= source_day THEN
      RAISE EXCEPTION 'Award requires the closed ISO week in Europe/Paris';
    END IF;
  ELSIF NEW.period_kind = 'month' THEN
    start_day := (period_value || '-01')::date;
    end_day := (start_day + interval '1 month - 1 day')::date;
    IF source_day < start_day OR source_day > end_day OR assigned_day <= end_day THEN
      RAISE EXCEPTION 'Award requires a closed calendar month';
    END IF;
  ELSE
    start_day := to_date(period_value || '-W01', 'IYYY-"W"IW');
    end_day := to_date((period_value::integer + 1)::text || '-W01', 'IYYY-"W"IW') - 1;
    IF source_day < start_day OR source_day > end_day OR assigned_day <= end_day THEN
      RAISE EXCEPTION 'Award requires a closed ISO year';
    END IF;
  END IF;
  IF NEW.award_type IN ('rising-star','skill-week','best-model') AND NEW.rank <> 1 THEN
    RAISE EXCEPTION 'Award requires the official first place';
  END IF;
  IF NEW.award_type = 'github-category' THEN
    IF lower(replace(position.metadata_json->'project'->>'category', ' ', '-')) IS DISTINCT FROM NEW.scope
      OR EXISTS (SELECT 1 FROM weekly_rankings r WHERE r.edition_id = NEW.edition_id AND r.rank < NEW.rank
        AND lower(replace(r.metadata_json->'project'->>'category', ' ', '-')) = NEW.scope) THEN
      RAISE EXCEPTION 'Category award requires its first published category position';
    END IF;
  END IF;
  IF NEW.award_type = 'biggest-mover' THEN
    SELECT * INTO prior FROM weekly_chart_editions WHERE chart_type = 'github' AND week = (source_day - 7)::text
      AND published_at IS NOT NULL AND published_at <= NEW.assigned_at AND scoring_version = 'github-cross-source-v2'
      AND payload->>'provenance' = 'auto';
    SELECT * INTO prior_position FROM weekly_rankings WHERE edition_id = prior.id AND entity_id = NEW.entity_id;
    IF prior.id IS NULL OR prior_position.id IS NULL OR prior_position.rank <= NEW.rank
      OR EXISTS (SELECT 1 FROM badge_awards a JOIN badge_award_withdrawals w ON w.award_id = a.id WHERE a.edition_id = prior.id)
      OR COALESCE((NEW.evidence->'facts'->>'rankGain')::integer, -1) <> prior_position.rank - NEW.rank
      OR COALESCE((NEW.evidence->'facts'->>'previousRank')::integer, -1) <> prior_position.rank
      OR EXISTS (SELECT 1 FROM weekly_rankings c JOIN weekly_rankings p ON p.entity_id = c.entity_id
        WHERE c.edition_id = NEW.edition_id AND p.edition_id = prior.id
          AND ((p.rank - c.rank) > (prior_position.rank - NEW.rank)
            OR ((p.rank - c.rank) = (prior_position.rank - NEW.rank) AND c.rank < NEW.rank))) THEN
      RAISE EXCEPTION 'Mover award requires the greatest comparable positive rank change';
    END IF;
  END IF;
  IF NEW.award_type IN ('rookie-month','annual') THEN
    source_ids := NEW.evidence->'sourceEditionIds';
    IF source_ids IS NULL OR jsonb_typeof(source_ids) <> 'array' THEN RAISE EXCEPTION 'Aggregate award requires all sources'; END IF;
    SELECT count(*) INTO expected FROM generate_series(start_day::timestamp, end_day::timestamp, interval '1 day') day
      WHERE extract(isodow FROM day) = 7;
    SELECT count(*) INTO covered FROM weekly_chart_editions e
      WHERE e.id IN (SELECT jsonb_array_elements_text(source_ids)) AND e.chart_type = NEW.chart_type
        AND e.week ~ '^\d{4}-\d{2}-\d{2}$' AND e.week::date BETWEEN start_day AND end_day
        AND extract(isodow FROM e.week::date) = 7 AND e.published_at IS NOT NULL AND e.published_at <= NEW.assigned_at
        AND e.scoring_version = NEW.chart_type || '-cross-source-v2' AND e.payload->>'provenance' = 'auto';
    IF covered <> expected OR jsonb_array_length(source_ids) <> expected
      OR EXISTS (SELECT 1 FROM badge_awards a JOIN badge_award_withdrawals w ON w.award_id = a.id
        WHERE a.edition_id IN (SELECT jsonb_array_elements_text(source_ids))) THEN
      RAISE EXCEPTION 'Aggregate award requires a complete valid period';
    END IF;
    SELECT e.id INTO last_source FROM weekly_chart_editions e WHERE e.id IN (SELECT jsonb_array_elements_text(source_ids)) ORDER BY e.week DESC LIMIT 1;
    SELECT wins.entity_id, wins.total INTO selected_entity, selected_count
      FROM (SELECT r.entity_id, count(*)::integer total FROM weekly_rankings r
        WHERE r.edition_id IN (SELECT jsonb_array_elements_text(source_ids)) AND r.rank = 1 GROUP BY r.entity_id) wins
      LEFT JOIN weekly_rankings last_rank ON last_rank.edition_id = last_source AND last_rank.entity_id = wins.entity_id
      ORDER BY wins.total DESC, COALESCE(last_rank.rank, 2147483647), wins.entity_id COLLATE "C" LIMIT 1;
    IF selected_entity IS DISTINCT FROM NEW.entity_id OR COALESCE((NEW.evidence->'facts'->>'firstPlaces')::integer, -1) <> selected_count THEN
      RAISE EXCEPTION 'Aggregate award must match the deterministic first-place champion';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Compatibilité additive avec les éditions de douze heures et les preuves v3.
-- Aucune attribution ni preuve existante ne change.
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
    OR source.published_at > NEW.assigned_at OR source.scoring_version NOT IN (NEW.chart_type || '-cross-source-v2', NEW.chart_type || '-reference-v3')
    OR source.payload->>'provenance' IS DISTINCT FROM 'auto' OR source.week !~ '^\d{4}-\d{2}-\d{2}(T(00|12):00Z)?$' THEN
    RAISE EXCEPTION 'Award requires an official published corroborated daily edition';
  END IF;
  IF EXISTS (SELECT 1 FROM badge_awards a JOIN badge_award_withdrawals w ON w.award_id = a.id WHERE a.edition_id = NEW.edition_id) THEN
    RAISE EXCEPTION 'Award source has a recorded withdrawal';
  END IF;
  IF EXISTS (SELECT 1 FROM weekly_chart_editions newer
    WHERE newer.chart_type = source.chart_type AND left(newer.week, 10) = left(source.week, 10)
      AND newer.week > source.week AND newer.published_at IS NOT NULL AND newer.published_at <= NEW.assigned_at) THEN
    RAISE EXCEPTION 'Award requires the latest published Sunday slot';
  END IF;
  source_day := left(source.week, 10)::date;
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
    SELECT * INTO prior FROM weekly_chart_editions WHERE chart_type = 'github' AND left(week, 10) = (source_day - 7)::text
      AND published_at IS NOT NULL AND published_at <= NEW.assigned_at AND scoring_version IN ('github-cross-source-v2', 'github-reference-v3')
      AND payload->>'provenance' = 'auto' ORDER BY week DESC LIMIT 1;
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
    SELECT count(DISTINCT left(e.week, 10)) INTO covered FROM weekly_chart_editions e
      WHERE e.id IN (SELECT jsonb_array_elements_text(source_ids)) AND e.chart_type = NEW.chart_type
        AND e.week ~ '^\d{4}-\d{2}-\d{2}(T(00|12):00Z)?$' AND left(e.week, 10)::date BETWEEN start_day AND end_day
        AND extract(isodow FROM left(e.week, 10)::date) = 7 AND e.published_at IS NOT NULL AND e.published_at <= NEW.assigned_at
        AND e.scoring_version IN (NEW.chart_type || '-cross-source-v2', NEW.chart_type || '-reference-v3') AND e.payload->>'provenance' = 'auto'
        AND NOT EXISTS (SELECT 1 FROM weekly_chart_editions newer WHERE newer.chart_type = e.chart_type
          AND left(newer.week, 10) = left(e.week, 10) AND newer.week > e.week
          AND newer.published_at IS NOT NULL AND newer.published_at <= NEW.assigned_at);
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

CREATE TABLE chart_entities (
  id text PRIMARY KEY, type text NOT NULL DEFAULT 'github_project' CHECK (type IN ('github_project','skill','mcp','model','agent')), slug text NOT NULL UNIQUE, name text NOT NULL, description text, category text NOT NULL DEFAULT 'Other', source_url text NOT NULL, website_url text, active boolean NOT NULL DEFAULT true, featured boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE github_projects (
  id text PRIMARY KEY, entity_id text NOT NULL UNIQUE REFERENCES chart_entities(id), github_id double precision NOT NULL UNIQUE, owner text NOT NULL, repo text NOT NULL, full_name text NOT NULL UNIQUE, description text, homepage text, primary_language text, github_created_at timestamptz NOT NULL, github_updated_at timestamptz NOT NULL, github_pushed_at timestamptz, default_branch text NOT NULL, archived boolean NOT NULL, fork boolean NOT NULL, disabled boolean NOT NULL, discovered_at timestamptz NOT NULL DEFAULT now(), last_synced_at timestamptz,
  tracking_status text NOT NULL DEFAULT 'candidate' CHECK (tracking_status IN ('candidate','tracked','ignored','blocked')), manual_tracking_status text CHECK (manual_tracking_status IN ('candidate','tracked','ignored','blocked')), last_error text
);
--> statement-breakpoint
CREATE INDEX github_projects_status_idx ON github_projects(tracking_status);
CREATE INDEX github_projects_sync_idx ON github_projects(last_synced_at);
--> statement-breakpoint
CREATE TABLE github_daily_snapshots (
  id text PRIMARY KEY, github_project_id text NOT NULL REFERENCES github_projects(id), snapshot_date date NOT NULL,
  stars integer NOT NULL CHECK (stars >= 0), forks integer NOT NULL CHECK (forks >= 0), watchers integer CHECK (watchers >= 0), open_issues integer NOT NULL CHECK (open_issues >= 0), contributors_count integer CHECK (contributors_count >= 0), commit_activity integer CHECK (commit_activity >= 0), releases_count integer CHECK (releases_count >= 0), github_pushed_at timestamptz, collected_at timestamptz NOT NULL, source text NOT NULL DEFAULT 'github' CHECK (source = 'github')
);
--> statement-breakpoint
CREATE UNIQUE INDEX github_daily_project_date_idx ON github_daily_snapshots(github_project_id, snapshot_date);
CREATE INDEX github_daily_date_idx ON github_daily_snapshots(snapshot_date);
--> statement-breakpoint
CREATE TABLE weekly_chart_editions (
  id text PRIMARY KEY, chart_type text NOT NULL, week text NOT NULL CHECK (week ~ '^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$'), scoring_version text NOT NULL, config jsonb NOT NULL, payload jsonb NOT NULL, frozen_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX weekly_chart_week_idx ON weekly_chart_editions(chart_type, week);
CREATE INDEX weekly_chart_published_idx ON weekly_chart_editions(published_at);
--> statement-breakpoint
CREATE TABLE weekly_rankings (
  id text PRIMARY KEY, edition_id text NOT NULL REFERENCES weekly_chart_editions(id), entity_id text NOT NULL REFERENCES chart_entities(id), rank integer NOT NULL CHECK (rank BETWEEN 1 AND 20), previous_rank integer, rank_change integer NOT NULL, score double precision NOT NULL CHECK (score BETWEEN 0 AND 100), status text NOT NULL CHECK (status IN ('new','rising','falling','stable')), metadata_json jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX weekly_rank_entity_idx ON weekly_rankings(edition_id, entity_id);
CREATE UNIQUE INDEX weekly_rank_position_idx ON weekly_rankings(edition_id, rank);
CREATE INDEX weekly_rank_entity_history_idx ON weekly_rankings(entity_id);
--> statement-breakpoint
CREATE TABLE charts_job_runs (
  id text PRIMARY KEY, job_type text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status text NOT NULL CHECK (status IN ('running','success','partial','failed','skipped','insufficient_history')), processed integer NOT NULL DEFAULT 0, succeeded integer NOT NULL DEFAULT 0, failed integer NOT NULL DEFAULT 0, error_details jsonb NOT NULL DEFAULT '[]'
);
--> statement-breakpoint
CREATE INDEX charts_job_started_idx ON charts_job_runs(started_at);
CREATE UNIQUE INDEX charts_job_running_idx ON charts_job_runs(job_type) WHERE status = 'running';
--> statement-breakpoint
CREATE TABLE charts_configuration (id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE charts_editorial (edition_id text NOT NULL REFERENCES weekly_chart_editions(id), layer text NOT NULL CHECK (layer IN ('draft','published')), payload jsonb NOT NULL, etag text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (edition_id, layer));
--> statement-breakpoint
CREATE FUNCTION charts_preserve_measurement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SANDBOX CHARTS measurements are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER github_daily_immutable BEFORE UPDATE OR DELETE ON github_daily_snapshots FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
CREATE TRIGGER weekly_rankings_immutable BEFORE UPDATE OR DELETE ON weekly_rankings FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
--> statement-breakpoint
CREATE FUNCTION charts_preserve_edition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'SANDBOX CHARTS editions are immutable'; END IF;
  IF (to_jsonb(NEW) - 'published_at') IS DISTINCT FROM (to_jsonb(OLD) - 'published_at') OR OLD.published_at IS NOT NULL OR NEW.published_at IS NULL THEN
    RAISE EXCEPTION 'SANDBOX CHARTS edition may only be published once';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER weekly_edition_immutable BEFORE UPDATE OR DELETE ON weekly_chart_editions FOR EACH ROW EXECUTE FUNCTION charts_preserve_edition();

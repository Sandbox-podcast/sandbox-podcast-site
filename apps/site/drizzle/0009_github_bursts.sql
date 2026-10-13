CREATE TABLE github_star_observations (
  id text PRIMARY KEY,
  github_project_id text NOT NULL REFERENCES github_projects(id),
  observed_at timestamptz NOT NULL,
  stars integer NOT NULL CHECK (stars >= 0),
  UNIQUE (github_project_id, observed_at)
);
--> statement-breakpoint
CREATE INDEX github_star_observations_time_idx ON github_star_observations(observed_at);
--> statement-breakpoint
CREATE TRIGGER github_star_observations_immutable BEFORE UPDATE OR DELETE ON github_star_observations FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
--> statement-breakpoint
CREATE TABLE github_burst_events (
  id text PRIMARY KEY,
  github_project_id text NOT NULL REFERENCES github_projects(id),
  observed_at timestamptz NOT NULL,
  window_hours integer NOT NULL CHECK (window_hours BETWEEN 1 AND 48),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'object'),
  UNIQUE (github_project_id, window_hours, observed_at)
);
--> statement-breakpoint
CREATE INDEX github_burst_events_time_idx ON github_burst_events(observed_at);
--> statement-breakpoint
CREATE TRIGGER github_burst_events_immutable BEFORE UPDATE OR DELETE ON github_burst_events FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
--> statement-breakpoint
CREATE TABLE github_trending_observations (
  id text PRIMARY KEY,
  observed_at timestamptz NOT NULL UNIQUE,
  repositories jsonb NOT NULL CHECK (jsonb_typeof(repositories) = 'array'),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TRIGGER github_trending_observations_immutable BEFORE UPDATE OR DELETE ON github_trending_observations FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();

ALTER TABLE chart_entities
  ADD COLUMN organization text,
  ADD COLUMN license text,
  ADD COLUMN open_weights boolean;
--> statement-breakpoint
CREATE TABLE chart_entity_sources (
  id text PRIMARY KEY,
  entity_id text NOT NULL REFERENCES chart_entities(id),
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9][a-z0-9.-]*$'),
  external_id text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 512),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  source_label text NOT NULL CHECK (length(source_label) BETWEEN 1 AND 120),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, provider, external_id)
);
--> statement-breakpoint
CREATE INDEX chart_entity_source_provider_idx
  ON chart_entity_sources(provider, external_id);
--> statement-breakpoint
CREATE TABLE chart_source_snapshots (
  id text PRIMARY KEY,
  entity_source_id text NOT NULL REFERENCES chart_entity_sources(id),
  observed_on date NOT NULL,
  collected_at timestamptz NOT NULL,
  metrics jsonb NOT NULL CHECK (jsonb_typeof(metrics) = 'object'),
  UNIQUE (entity_source_id, observed_on)
);
--> statement-breakpoint
CREATE INDEX chart_source_snapshot_observed_idx
  ON chart_source_snapshots(observed_on);
--> statement-breakpoint
CREATE TRIGGER chart_source_snapshot_immutable
  BEFORE UPDATE OR DELETE ON chart_source_snapshots
  FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();

CREATE TABLE ranking_collections (
  collection_key text PRIMARY KEY CHECK (collection_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  source_chart text NOT NULL CHECK (source_chart ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  entity_kind text NOT NULL CHECK (entity_kind IN ('github_project','skill','mcp','model','agent')),
  intent text NOT NULL CHECK (intent IN ('popular','trending','benchmark','editorial_best')),
  method text NOT NULL CHECK (method IN ('popularity','momentum','benchmark','editorial_review')),
  target jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(target) = 'object'),
  cadence text NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly','monthly','release')),
  minimum_candidates integer NOT NULL DEFAULT 10 CHECK (minimum_candidates BETWEEN 1 AND 1000),
  minimum_public_editions integer NOT NULL DEFAULT 1 CHECK (minimum_public_editions BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (intent = 'popular' AND method = 'popularity') OR
    (intent = 'trending' AND method = 'momentum') OR
    (intent = 'benchmark' AND method = 'benchmark') OR
    (intent = 'editorial_best' AND method = 'editorial_review')
  )
);
--> statement-breakpoint
CREATE INDEX ranking_collections_active_idx ON ranking_collections(active);
--> statement-breakpoint
INSERT INTO ranking_collections (
  collection_key, source_chart, entity_kind, intent, method, target,
  minimum_candidates, minimum_public_editions, active
) VALUES
  ('github', 'github', 'github_project', 'trending', 'momentum', '{}'::jsonb, 20, 1, false),
  ('rising', 'github', 'github_project', 'trending', 'momentum', '{}'::jsonb, 1, 1, false),
  ('skills', 'skills', 'skill', 'popular', 'popularity', '{}'::jsonb, 10, 1, false),
  ('models', 'models', 'model', 'benchmark', 'benchmark', '{}'::jsonb, 10, 1, false)
ON CONFLICT (collection_key) DO NOTHING;
--> statement-breakpoint
ALTER TABLE weekly_chart_editions
  ADD CONSTRAINT weekly_chart_collection_fk
  FOREIGN KEY (chart_type) REFERENCES ranking_collections(collection_key);
--> statement-breakpoint
CREATE TABLE ranking_collection_localizations (
  collection_key text NOT NULL REFERENCES ranking_collections(collection_key),
  locale text NOT NULL CHECK (locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
  localized_slug text NOT NULL CHECK (localized_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  localized_path text NOT NULL CHECK (localized_path ~ '^/[^?#]*$' AND localized_path !~ '^//'),
  title text NOT NULL CHECK (length(title) BETWEEN 10 AND 180),
  meta_title text NOT NULL CHECK (length(meta_title) BETWEEN 10 AND 180),
  meta_description text NOT NULL CHECK (length(meta_description) BETWEEN 30 AND 320),
  heading text NOT NULL CHECK (length(heading) BETWEEN 5 AND 180),
  introduction text NOT NULL CHECK (length(introduction) >= 30),
  methodology_summary text NOT NULL CHECK (length(methodology_summary) >= 30),
  review_state text NOT NULL DEFAULT 'draft' CHECK (review_state IN ('draft','needs_review','reviewed','published')),
  source_locale text NOT NULL CHECK (source_locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
  source_hash text NOT NULL CHECK (length(source_hash) >= 16),
  reviewed_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_key, locale),
  UNIQUE (localized_path),
  UNIQUE (locale, localized_slug),
  CHECK (review_state <> 'reviewed' OR reviewed_at IS NOT NULL),
  CHECK (review_state <> 'published' OR (reviewed_at IS NOT NULL AND published_at IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX ranking_localization_state_idx ON ranking_collection_localizations(review_state, published_at);
--> statement-breakpoint
CREATE TABLE ranking_entity_localizations (
  entity_id text NOT NULL REFERENCES chart_entities(id),
  locale text NOT NULL CHECK (locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 180),
  tagline text NOT NULL CHECK (length(tagline) BETWEEN 1 AND 240),
  description text NOT NULL CHECK (length(description) >= 30),
  limitations text NOT NULL CHECK (length(limitations) >= 10),
  review_state text NOT NULL DEFAULT 'draft' CHECK (review_state IN ('draft','needs_review','reviewed','published')),
  source_locale text NOT NULL CHECK (source_locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
  source_hash text NOT NULL CHECK (length(source_hash) >= 16),
  reviewed_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, locale),
  CHECK (review_state <> 'reviewed' OR reviewed_at IS NOT NULL),
  CHECK (review_state <> 'published' OR (reviewed_at IS NOT NULL AND published_at IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX ranking_entity_localization_state_idx ON ranking_entity_localizations(locale, review_state);
--> statement-breakpoint
CREATE TABLE ranking_evidence (
  id text PRIMARY KEY,
  entity_id text NOT NULL REFERENCES chart_entities(id),
  collection_key text REFERENCES ranking_collections(collection_key),
  fact_key text NOT NULL CHECK (fact_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  fact_value jsonb NOT NULL,
  unit text,
  source_kind text NOT NULL CHECK (source_kind IN ('repository','publisher','independent_test','benchmark','editorial')),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  observed_at timestamptz NOT NULL,
  verified_at timestamptz,
  reviewer text,
  review_state text NOT NULL DEFAULT 'unreviewed' CHECK (review_state IN ('unreviewed','verified','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (review_state <> 'verified' OR (verified_at IS NOT NULL AND reviewer IS NOT NULL)),
  CHECK (review_state <> 'rejected' OR (verified_at IS NOT NULL AND reviewer IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX ranking_evidence_entity_idx ON ranking_evidence(entity_id, fact_key);
CREATE INDEX ranking_evidence_collection_idx ON ranking_evidence(collection_key, fact_key);

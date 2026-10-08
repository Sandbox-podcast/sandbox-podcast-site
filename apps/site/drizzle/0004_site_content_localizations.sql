CREATE TABLE site_content_localizations (
  content_kind text NOT NULL CHECK (content_kind IN ('home','episode','topic','entity','page')),
  content_key text NOT NULL CHECK (length(content_key) BETWEEN 1 AND 180),
  locale text NOT NULL CHECK (locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
  localized_path text NOT NULL CHECK (localized_path ~ '^/[^?#]*$' AND localized_path !~ '^//'),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  meta_title text NOT NULL CHECK (length(meta_title) BETWEEN 10 AND 180),
  meta_description text NOT NULL CHECK (length(meta_description) BETWEEN 30 AND 320),
  heading text NOT NULL CHECK (length(heading) BETWEEN 5 AND 180),
  introduction text NOT NULL CHECK (length(introduction) >= 30),
  sections jsonb NOT NULL CHECK (jsonb_typeof(sections) = 'array' AND jsonb_array_length(sections) > 0),
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(chapters) = 'array'),
  review_state text NOT NULL DEFAULT 'draft' CHECK (review_state IN ('draft','needs_review','reviewed','published')),
  source_locale text NOT NULL CHECK (source_locale ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
  source_hash text NOT NULL CHECK (length(source_hash) >= 16),
  reviewed_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_kind, content_key, locale),
  UNIQUE (localized_path),
  CHECK (review_state <> 'reviewed' OR reviewed_at IS NOT NULL),
  CHECK (review_state <> 'published' OR (reviewed_at IS NOT NULL AND published_at IS NOT NULL)),
  CHECK (content_kind <> 'episode' OR content_key ~ '^[0-9]{1,6}$')
);
--> statement-breakpoint
CREATE INDEX site_localization_state_locale_idx ON site_content_localizations(review_state, locale);
--> statement-breakpoint
CREATE INDEX site_localization_source_idx ON site_content_localizations(content_kind, content_key, locale);

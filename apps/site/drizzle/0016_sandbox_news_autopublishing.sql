CREATE TABLE news_items (
  id text PRIMARY KEY,
  canonical_url text NOT NULL,
  source_id text NOT NULL,
  source_name text NOT NULL,
  published_at text NOT NULL,
  category text NOT NULL,
  payload jsonb NOT NULL,
  source_excerpt_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX news_items_canonical_url_idx ON news_items (canonical_url);
--> statement-breakpoint
CREATE INDEX news_items_published_at_idx ON news_items (published_at);
--> statement-breakpoint
CREATE INDEX news_items_source_published_idx ON news_items (source_id, published_at);
--> statement-breakpoint
CREATE TABLE news_source_status (
  source_id text PRIMARY KEY,
  source_name text NOT NULL,
  source_url text NOT NULL,
  ok boolean NOT NULL,
  reason text,
  checked_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

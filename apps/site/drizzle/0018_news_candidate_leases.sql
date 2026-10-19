ALTER TABLE news_candidates ADD COLUMN lease_id text;
--> statement-breakpoint
ALTER TABLE news_candidates ADD COLUMN lease_expires_at timestamptz;

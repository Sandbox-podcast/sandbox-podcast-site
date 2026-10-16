CREATE TABLE admin_login_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 6),
  expires_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX admin_login_attempts_expiration_idx ON admin_login_attempts (expires_at);

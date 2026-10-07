CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_login_unique" UNIQUE("login")
);

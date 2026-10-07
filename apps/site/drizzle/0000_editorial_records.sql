CREATE TABLE IF NOT EXISTS "editorial_records" (
	"collection" text NOT NULL,
	"entity_key" text NOT NULL,
	"layer" text NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_records_collection_entity_key_layer_pk" PRIMARY KEY("collection","entity_key","layer")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editorial_draft_meta" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"etag" text NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);

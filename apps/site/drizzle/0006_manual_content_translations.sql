CREATE TABLE "site_translation_messages" (
  "locale" text NOT NULL,
  "source_hash" text NOT NULL,
  "source" text NOT NULL,
  "translation" text NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "site_translation_messages_pk" PRIMARY KEY ("locale", "source_hash"),
  CONSTRAINT "site_translation_hash_check" CHECK ("source_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "site_translation_text_check" CHECK (length(btrim("source")) > 0 AND length(btrim("translation")) > 0)
);

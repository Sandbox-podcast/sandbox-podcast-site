CREATE TABLE "episode_thumbnails" (
  "sha256" text PRIMARY KEY,
  "image" bytea NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "episode_thumbnails_sha256_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "episode_thumbnails_dimensions_check" CHECK ("width" >= 1280 AND "height" >= 720)
);

CREATE TABLE "host_photos" (
  "sha256" text PRIMARY KEY,
  "image" bytea NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "host_photos_sha256_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "host_photos_size_check" CHECK ("size" >= 400)
);

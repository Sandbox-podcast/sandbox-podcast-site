ALTER TABLE github_daily_snapshots ADD COLUMN refresh_slot_id text;
--> statement-breakpoint
DROP TRIGGER github_daily_immutable ON github_daily_snapshots;
--> statement-breakpoint
UPDATE github_daily_snapshots
SET refresh_slot_id = 'legacy:' || snapshot_date::text;
--> statement-breakpoint
ALTER TABLE github_daily_snapshots ALTER COLUMN refresh_slot_id SET NOT NULL;
--> statement-breakpoint
CREATE TRIGGER github_daily_immutable
  BEFORE UPDATE OR DELETE ON github_daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
--> statement-breakpoint
DROP INDEX github_daily_project_date_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX github_daily_project_slot_idx
  ON github_daily_snapshots(github_project_id, refresh_slot_id);
--> statement-breakpoint
ALTER TABLE chart_source_snapshots ADD COLUMN refresh_slot_id text;
--> statement-breakpoint
DROP TRIGGER chart_source_snapshot_immutable ON chart_source_snapshots;
--> statement-breakpoint
UPDATE chart_source_snapshots
SET refresh_slot_id = 'legacy:' || observed_on::text;
--> statement-breakpoint
ALTER TABLE chart_source_snapshots ALTER COLUMN refresh_slot_id SET NOT NULL;
--> statement-breakpoint
CREATE TRIGGER chart_source_snapshot_immutable
  BEFORE UPDATE OR DELETE ON chart_source_snapshots
  FOR EACH ROW EXECUTE FUNCTION charts_preserve_measurement();
--> statement-breakpoint
ALTER TABLE chart_source_snapshots DROP CONSTRAINT chart_source_snapshots_entity_source_id_observed_on_key;
--> statement-breakpoint
CREATE UNIQUE INDEX chart_source_snapshot_slot_idx
  ON chart_source_snapshots(entity_source_id, refresh_slot_id);
--> statement-breakpoint
ALTER TABLE weekly_chart_editions DROP CONSTRAINT IF EXISTS weekly_chart_editions_week_check;
--> statement-breakpoint
ALTER TABLE weekly_chart_editions ADD CONSTRAINT weekly_chart_editions_week_check
  CHECK (week ~ '^(\d{4}-W(0[1-9]|[1-4]\d|5[0-3])|\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])|\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(00|12):00Z)$');

ALTER TABLE weekly_chart_editions DROP CONSTRAINT IF EXISTS weekly_chart_editions_week_check;
--> statement-breakpoint
ALTER TABLE weekly_chart_editions ADD CONSTRAINT weekly_chart_editions_week_check CHECK (week ~ '^(\d{4}-W(0[1-9]|[1-4]\d|5[0-3])|\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))$');

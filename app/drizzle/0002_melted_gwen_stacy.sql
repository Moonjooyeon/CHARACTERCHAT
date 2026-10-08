CREATE TABLE `memory_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`from_turn` integer NOT NULL,
	`to_turn` integer NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'provider_required' NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_range` ON `memory_summaries` (`owner`,`session_id`,`from_turn`,`to_turn`);--> statement-breakpoint
CREATE INDEX `summary_owner` ON `memory_summaries` (`owner`,`session_id`);--> statement-breakpoint
CREATE TABLE `session_memory` (
	`session_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`manual` text DEFAULT '' NOT NULL,
	`user_notes` text DEFAULT '' NOT NULL,
	`persona` text DEFAULT '' NOT NULL,
	`interval` integer DEFAULT 10 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `memory_owner` ON `session_memory` (`owner`);
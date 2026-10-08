CREATE TABLE `session_status` (
	`session_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `status_owner` ON `session_status` (`owner`);
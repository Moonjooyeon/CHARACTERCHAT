CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `personas_owner` ON `personas` (`owner`,`archived`);--> statement-breakpoint
CREATE TABLE `session_details` (
	`session_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`persona_snapshot` text DEFAULT '{}' NOT NULL,
	`provenance` text DEFAULT '{}' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_details_owner` ON `session_details` (`owner`);--> statement-breakpoint
CREATE TABLE `status_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`fields` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`source_id` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `templates_owner` ON `status_templates` (`owner`,`archived`);--> statement-breakpoint
CREATE INDEX `templates_gallery` ON `status_templates` (`visibility`,`archived`);--> statement-breakpoint
CREATE TABLE `template_imports` (
	`owner` text NOT NULL,
	`source_id` text NOT NULL,
	`template_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `template_import_once` ON `template_imports` (`owner`,`source_id`);--> statement-breakpoint
ALTER TABLE `session_memory` ADD `include_book` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `works` ADD `revision` integer DEFAULT 0 NOT NULL;
CREATE TABLE `character_collection` (
	`owner` text NOT NULL,
	`character_key` text NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_collection_owner_key` ON `character_collection` (`owner`,`character_key`);--> statement-breakpoint
CREATE TABLE `model_preferences` (
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`choice` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_preferences_owner_session` ON `model_preferences` (`owner`,`session_id`);
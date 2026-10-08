CREATE TABLE `age_declarations` (
	`owner` text PRIMARY KEY NOT NULL,
	`declared_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collectible_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`work_id` text NOT NULL,
	`character_id` text NOT NULL,
	`character_name` text NOT NULL,
	`title` text NOT NULL,
	`condition` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`rating` text DEFAULT '19+' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collectible_work` ON `collectible_assets` (`owner`,`work_id`,`active`);--> statement-breakpoint
CREATE TABLE `collection_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`asset_id` text NOT NULL,
	`work_id` text NOT NULL,
	`character_id` text NOT NULL,
	`session_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_unique` ON `collection_grants` (`owner`,`asset_id`);--> statement-breakpoint
CREATE INDEX `collection_owner` ON `collection_grants` (`owner`);
CREATE TABLE `character_media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`duration` integer,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `character_media_owner` ON `character_media` (`owner`);
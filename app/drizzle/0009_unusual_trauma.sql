CREATE TABLE `my_characters` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `my_characters_owner` ON `my_characters` (`owner`,`updated`);
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_id` text NOT NULL,
	`prompt` text NOT NULL,
	`ratio` text NOT NULL,
	`image` text NOT NULL,
	`cost` integer NOT NULL,
	`count` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_request` ON `assets` (`owner`,`request_id`);--> statement-breakpoint
CREATE INDEX `assets_owner` ON `assets` (`owner`);--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`asset_id` text NOT NULL,
	`delta` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_asset` ON `ledger` (`asset_id`);--> statement-breakpoint
CREATE INDEX `ledger_owner` ON `ledger` (`owner`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_session` ON `messages` (`owner`,`session_id`,`created`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`work_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`opening` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_owner` ON `sessions` (`owner`,`archived`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `works_owner` ON `works` (`owner`,`archived`);
CREATE TABLE `message_bookmarks` (
	`message_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`label` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`request_id` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmark_owner` ON `message_bookmarks` (`owner`,`session_id`);--> statement-breakpoint
CREATE TABLE `message_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`message_id` text NOT NULL,
	`request_id` text NOT NULL,
	`capture_key` text NOT NULL,
	`revision` integer NOT NULL,
	`previous_content` text NOT NULL,
	`content` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_edit_request` ON `message_revisions` (`owner`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_edit_version` ON `message_revisions` (`message_id`,`revision`);--> statement-breakpoint
CREATE INDEX `message_revision_owner` ON `message_revisions` (`owner`,`session_id`);--> statement-breakpoint
ALTER TABLE `messages` ADD `revision` integer DEFAULT 0 NOT NULL;
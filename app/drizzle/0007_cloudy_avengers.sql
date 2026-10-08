CREATE TABLE `test_purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`units` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_purchase_request` ON `test_purchases` (`owner`,`request_id`);--> statement-breakpoint
CREATE INDEX `test_purchase_owner` ON `test_purchases` (`owner`,`created`);
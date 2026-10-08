CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`units` integer NOT NULL,
	`amount` integer NOT NULL,
	`mode` text NOT NULL,
	`mid` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token` text NOT NULL,
	`tid` text,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_orders_tid_unique` ON `payment_orders` (`tid`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_order_request` ON `payment_orders` (`owner`,`request_id`);--> statement-breakpoint
CREATE INDEX `payment_order_owner` ON `payment_orders` (`owner`,`created`);
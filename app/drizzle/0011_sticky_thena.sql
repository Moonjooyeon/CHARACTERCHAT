CREATE TABLE `attendance` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`grapes` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_owner_day` ON `attendance` (`owner`,`day`);
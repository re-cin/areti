CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_rounds` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);
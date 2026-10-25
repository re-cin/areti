CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`display_name` text DEFAULT '' NOT NULL,
	`picture_uri` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`title` text NOT NULL,
	`subject_id` text NOT NULL,
	`date` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`plan_id` text,
	`movable` integer DEFAULT false NOT NULL,
	`has_pomodoro` integer DEFAULT false NOT NULL,
	`notification_sound` text DEFAULT 'Silent' NOT NULL
);

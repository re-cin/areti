CREATE TABLE `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`subject_id` text,
	`planned_session_id` text,
	`started_at` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ghost_state` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text DEFAULT 'Reti' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`equipped_expression` text DEFAULT 'neutral' NOT NULL,
	`unlocked_expressions` text DEFAULT '["neutral"]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `planned_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`plan_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`date` integer NOT NULL,
	`start_minute` integer,
	`blocks` integer NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`excluded` integer DEFAULT false NOT NULL,
	`completed_blocks` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`subject_id` text NOT NULL,
	`exam_date` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`difficulty` integer DEFAULT 3 NOT NULL,
	`urgency` integer DEFAULT 3 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);

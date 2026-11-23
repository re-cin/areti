ALTER TABLE `study_plans` ADD `difficulty` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
UPDATE `study_plans`
SET `difficulty` = COALESCE((SELECT CASE WHEN `subjects`.`difficulty` BETWEEN 1 AND 5 THEN `subjects`.`difficulty` ELSE 3 END FROM `subjects` WHERE `subjects`.`id` = `study_plans`.`subject_id`), 3),
    `updated_at` = MAX(`updated_at` + 1, CAST((julianday('now') - 2440587.5) * 86400000 AS integer));
--> statement-breakpoint
ALTER TABLE `subjects` DROP COLUMN `difficulty`;

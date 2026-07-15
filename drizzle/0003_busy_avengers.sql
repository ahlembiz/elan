CREATE TABLE `plan_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`title_fr` text NOT NULL,
	`title_en` text NOT NULL,
	`target_duration` integer NOT NULL,
	`effort_level` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by_role` text NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `theme` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `effort_level` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `duration_minutes` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `stage` text DEFAULT 'foundation' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `equipment_fr` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `equipment_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `plan_entries` ADD `session_id` text REFERENCES plan_sessions(id);
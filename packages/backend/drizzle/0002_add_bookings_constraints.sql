-- Recreate bookings table with FK (event_type_id → event_types) and unique index on starts_at
CREATE TABLE `__new_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type_id` text REFERENCES `event_types`(`id`) ON DELETE SET NULL,
	`event_type_name` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`guest_name` text NOT NULL,
	`guest_email` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_bookings` SELECT * FROM `bookings`;
--> statement-breakpoint
DROP TABLE `bookings`;
--> statement-breakpoint
ALTER TABLE `__new_bookings` RENAME TO `bookings`;
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_starts_at_uniq` ON `bookings` (`starts_at`);

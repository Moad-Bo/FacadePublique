CREATE TABLE `moderation_log` (
	`id` varchar(36) NOT NULL,
	`reported_by` varchar(36) NOT NULL,
	`target_type` varchar(20) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`reason` varchar(100) NOT NULL,
	`details` text,
	`status` varchar(20) DEFAULT 'pending',
	`resolved_by` varchar(36),
	`resolved_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `moderation_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`target_role` varchar(50),
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`action_url` text,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_log` ADD `content` text;--> statement-breakpoint
ALTER TABLE `forum_reply` ADD `is_reported` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `forum_thread` ADD `is_reported` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `moderation_log` ADD CONSTRAINT `moderation_log_reported_by_user_id_fk` FOREIGN KEY (`reported_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `moderation_log` ADD CONSTRAINT `moderation_log_resolved_by_user_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_notif_user_read` ON `notification` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `idx_notif_role` ON `notification` (`target_role`);
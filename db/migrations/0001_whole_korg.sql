CREATE TABLE `email_layout` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(20) DEFAULT 'contact',
	`description` text,
	`html` mediumtext NOT NULL,
	`is_default` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_layout_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` varchar(36) NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`subject` text NOT NULL,
	`template` varchar(50),
	`type` varchar(20) DEFAULT 'system',
	`status` varchar(20) DEFAULT 'sent',
	`error_message` text,
	`message_id` varchar(255),
	`campaign_id` varchar(36),
	`opened_at` timestamp,
	`open_count` int DEFAULT 0,
	`sent_at` timestamp DEFAULT (now()),
	CONSTRAINT `email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_queue` (
	`id` varchar(36) NOT NULL,
	`recipient` varchar(255) NOT NULL,
	`subject` text NOT NULL,
	`html` mediumtext NOT NULL,
	`type` varchar(20) DEFAULT 'manual',
	`template` varchar(50),
	`status` varchar(20) DEFAULT 'pending',
	`scheduled_at` timestamp NOT NULL,
	`recurrence` varchar(20) DEFAULT 'none',
	`recurrence_value` varchar(100),
	`layout_id` varchar(36),
	`timezone` varchar(50) DEFAULT 'Europe/Paris',
	`error_message` text,
	`retry_count` int DEFAULT 0,
	`locked_at` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ip_ban` (
	`ip_address` varchar(100) NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ip_ban_ip_address` PRIMARY KEY(`ip_address`)
);
--> statement-breakpoint
CREATE TABLE `mailbox` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36),
	`deleted_user_ref` text,
	`from_name` text NOT NULL,
	`from_email` varchar(255) NOT NULL,
	`subject` text NOT NULL,
	`body` mediumtext NOT NULL,
	`date` timestamp DEFAULT (now()),
	`unread` boolean DEFAULT true,
	`starred` boolean DEFAULT false,
	`important` boolean DEFAULT false,
	`pinned` boolean DEFAULT false,
	`archived` boolean DEFAULT false,
	`trashed` boolean DEFAULT false,
	`category` varchar(20) DEFAULT 'inbox',
	`to_account` varchar(20) DEFAULT 'contact',
	`folder_id` varchar(36),
	`labels` json,
	`size` int DEFAULT 0,
	CONSTRAINT `mailbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mailbox_attachment` (
	`id` varchar(36) NOT NULL,
	`mailbox_id` varchar(36),
	`filename` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`r2_key` varchar(500) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mailbox_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mailbox_folder` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(50) DEFAULT 'i-lucide:folder',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mailbox_folder_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mailbox_label` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT 'primary',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mailbox_label_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_campaign` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`template_id` varchar(36),
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`status` varchar(20) DEFAULT 'draft',
	`sent_at` timestamp,
	`total_recipients` int DEFAULT 0,
	`delivered_count` int DEFAULT 0,
	`opened_count` int DEFAULT 0,
	`failed_count` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `newsletter_campaign_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscriber` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` text,
	`status` varchar(20) DEFAULT 'subscribed',
	`cookie_choice` json,
	`contact_info` text,
	`subscribed_at` timestamp DEFAULT (now()),
	CONSTRAINT `newsletter_subscriber_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscriber_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_template` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`subject` text NOT NULL,
	`content` mediumtext NOT NULL,
	`icon` varchar(50) DEFAULT 'i-lucide:mail',
	`layout_id` varchar(36) DEFAULT 'newsletter',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletter_template_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`permissions` mediumtext,
	`is_static` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `security_event` (
	`id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`ip_address` varchar(100) NOT NULL,
	`email` varchar(255),
	`user_agent` text,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `system_template` (
	`id` varchar(36) NOT NULL,
	`description` text,
	`subject` text NOT NULL,
	`content` mediumtext NOT NULL,
	`layout_id` varchar(36) DEFAULT 'system',
	`is_default` boolean DEFAULT true,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_template_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `users_table`;--> statement-breakpoint
DROP INDEX `session_token_unique` ON `session`;--> statement-breakpoint
DROP INDEX `user_email_unique` ON `user`;--> statement-breakpoint
ALTER TABLE `user` MODIFY COLUMN `emailVerified` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `user` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `user` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `account` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `session` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `user` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `verification` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `session` ADD `impersonated_by` text;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text;--> statement-breakpoint
ALTER TABLE `user` ADD `permissions` mediumtext;--> statement-breakpoint
ALTER TABLE `user` ADD `banned` boolean;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `ban_expires` timestamp(3);--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_token_unique` UNIQUE(`token`);--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `mailbox` ADD CONSTRAINT `mailbox_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mailbox_attachment` ADD CONSTRAINT `mailbox_attachment_mailbox_id_mailbox_id_fk` FOREIGN KEY (`mailbox_id`) REFERENCES `mailbox`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mailbox_folder` ADD CONSTRAINT `mailbox_folder_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mailbox_label` ADD CONSTRAINT `mailbox_label_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsletter_campaign` ADD CONSTRAINT `newsletter_campaign_template_id_newsletter_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `newsletter_template`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;
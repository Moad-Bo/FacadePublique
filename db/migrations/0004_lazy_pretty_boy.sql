CREATE TABLE `asset` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(20) NOT NULL,
	`target_id` varchar(36),
	`filename` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size` int NOT NULL,
	`r2_key` varchar(500) NOT NULL,
	`public_url` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `asset_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audience` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`user_id` varchar(36),
	`opt_in_newsletter` boolean DEFAULT false,
	`opt_in_marketing` boolean DEFAULT false,
	`opt_in_forum` boolean DEFAULT true,
	`source` varchar(50) DEFAULT 'landing',
	`unsubscribed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audience_id` PRIMARY KEY(`id`),
	CONSTRAINT `audience_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `mailbox_rule` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(100),
	`sender_email` varchar(255) NOT NULL,
	`target_folder_id` varchar(36) NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mailbox_rule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `private_message` (
	`id` varchar(36) NOT NULL,
	`from_id` varchar(36) NOT NULL,
	`to_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `private_message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spam_filter` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`email` varchar(255) NOT NULL,
	`reason` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `spam_filter_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terms_agreement` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`version` varchar(10) NOT NULL DEFAULT 'v1',
	`accepted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terms_agreement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`status` varchar(20) DEFAULT 'open',
	`priority` varchar(20) DEFAULT 'medium',
	`category` varchar(50) DEFAULT 'general',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ticket_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_message` (
	`id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`is_admin` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ticket_message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `forum_terms_agreement`;--> statement-breakpoint
DROP TABLE `newsletter_subscriber`;--> statement-breakpoint
ALTER TABLE `email_queue` ADD `cc` text;--> statement-breakpoint
ALTER TABLE `email_queue` ADD `bcc` text;--> statement-breakpoint
ALTER TABLE `email_queue` ADD `from_context` varchar(50);--> statement-breakpoint
ALTER TABLE `mailbox` ADD `cc` text;--> statement-breakpoint
ALTER TABLE `mailbox` ADD `bcc` text;--> statement-breakpoint
ALTER TABLE `mailbox` ADD `layout_id` varchar(36) DEFAULT 'inbox';--> statement-breakpoint
ALTER TABLE `mailbox` ADD `is_spam` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mailbox_folder` ADD `color` varchar(20) DEFAULT 'neutral';--> statement-breakpoint
ALTER TABLE `newsletter_campaign` ADD `from_context` varchar(50);--> statement-breakpoint
ALTER TABLE `newsletter_campaign` ADD `layout_id` varchar(36) DEFAULT 'newsletter';--> statement-breakpoint
ALTER TABLE `newsletter_campaign` ADD `content_layout_id` varchar(36);--> statement-breakpoint
ALTER TABLE `newsletter_campaign` ADD `clicked_count` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `theme_primary` varchar(50);--> statement-breakpoint
ALTER TABLE `user` ADD `theme_neutral` varchar(50);--> statement-breakpoint
ALTER TABLE `user` ADD `font_family` varchar(50);--> statement-breakpoint
ALTER TABLE `user` ADD `font_size` varchar(20);--> statement-breakpoint
ALTER TABLE `user` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `user` ADD `quote` varchar(255);--> statement-breakpoint
ALTER TABLE `user` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `asset` ADD CONSTRAINT `asset_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audience` ADD CONSTRAINT `audience_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mailbox_rule` ADD CONSTRAINT `mailbox_rule_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `private_message` ADD CONSTRAINT `private_message_from_id_user_id_fk` FOREIGN KEY (`from_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `private_message` ADD CONSTRAINT `private_message_to_id_user_id_fk` FOREIGN KEY (`to_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spam_filter` ADD CONSTRAINT `spam_filter_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terms_agreement` ADD CONSTRAINT `terms_agreement_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_message` ADD CONSTRAINT `ticket_message_ticket_id_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_message` ADD CONSTRAINT `ticket_message_sender_id_user_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `newsletter_campaign` ADD CONSTRAINT `newsletter_campaign_content_layout_id_email_layout_id_fk` FOREIGN KEY (`content_layout_id`) REFERENCES `email_layout`(`id`) ON DELETE no action ON UPDATE no action;
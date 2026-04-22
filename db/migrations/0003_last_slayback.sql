CREATE TABLE `forum_terms_agreement` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`version` varchar(10) NOT NULL DEFAULT 'v1',
	`accepted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_terms_agreement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `newsletter_subscriber` ADD `source` varchar(50) DEFAULT 'landing';--> statement-breakpoint
ALTER TABLE `forum_terms_agreement` ADD CONSTRAINT `forum_terms_agreement_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;
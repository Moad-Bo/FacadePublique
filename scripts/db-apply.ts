import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

const statements = [
  // 1. Forum Category
  `CREATE TABLE IF NOT EXISTS \`forum_category\` (
  	\`id\` varchar(36) NOT NULL,
  	\`name\` varchar(100) NOT NULL,
  	\`slug\` varchar(100) NOT NULL,
  	\`description\` text,
  	\`color\` varchar(20) DEFAULT 'primary',
  	\`icon\` varchar(50) DEFAULT 'i-lucide:message-square',
  	\`order\` int DEFAULT 0,
  	\`thread_count\` int DEFAULT 0,
  	\`createdAt\` timestamp DEFAULT (now()),
  	CONSTRAINT \`forum_category_id\` PRIMARY KEY(\`id\`),
  	CONSTRAINT \`forum_category_slug_unique\` UNIQUE(\`slug\`)
  )`,

  // 2. Forum Thread
  `CREATE TABLE IF NOT EXISTS \`forum_thread\` (
  	\`id\` varchar(36) NOT NULL,
  	\`author_id\` varchar(36) NOT NULL,
  	\`category_id\` varchar(36) NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` varchar(255) NOT NULL,
  	\`content\` mediumtext NOT NULL,
  	\`views\` int DEFAULT 0,
  	\`status\` varchar(20) DEFAULT 'open',
  	\`is_pinned\` boolean DEFAULT false,
  	\`is_resolved\` boolean DEFAULT false,
  	\`upvotes\` int DEFAULT 0,
  	\`downvotes\` int DEFAULT 0,
  	\`createdAt\` timestamp DEFAULT (now()),
  	\`updatedAt\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  	CONSTRAINT \`forum_thread_id\` PRIMARY KEY(\`id\`),
  	CONSTRAINT \`forum_thread_slug_unique\` UNIQUE(\`slug\`)
  )`,

  // 3. Forum Reply
  `CREATE TABLE IF NOT EXISTS \`forum_reply\` (
  	\`id\` varchar(36) NOT NULL,
  	\`thread_id\` varchar(36) NOT NULL,
  	\`author_id\` varchar(36) NOT NULL,
  	\`content\` text NOT NULL,
  	\`is_solution\` boolean DEFAULT false,
  	\`upvotes\` int DEFAULT 0,
  	\`downvotes\` int DEFAULT 0,
  	\`createdAt\` timestamp DEFAULT (now()),
  	\`updatedAt\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  	CONSTRAINT \`forum_reply_id\` PRIMARY KEY(\`id\`)
  )`,

  // 4. Forum Vote
  `CREATE TABLE IF NOT EXISTS \`forum_vote\` (
  	\`id\` varchar(36) NOT NULL,
  	\`user_id\` varchar(36) NOT NULL,
  	\`target_id\` varchar(36) NOT NULL,
  	\`target_type\` varchar(10) NOT NULL,
  	\`value\` int NOT NULL,
  	\`createdAt\` timestamp DEFAULT (now()),
  	CONSTRAINT \`forum_vote_id\` PRIMARY KEY(\`id\`)
  )`,

  // 5. Forum Agreement
  `CREATE TABLE IF NOT EXISTS \`forum_terms_agreement\` (
  	\`id\` varchar(36) NOT NULL,
  	\`user_id\` varchar(36) NOT NULL,
  	\`version\` varchar(10) NOT NULL DEFAULT 'v1',
  	\`accepted_at\` timestamp NOT NULL DEFAULT (now()),
  	CONSTRAINT \`forum_terms_agreement_id\` PRIMARY KEY(\`id\`)
  )`,

  // 6. Alter Newsletter
  `ALTER TABLE \`newsletter_subscriber\` ADD COLUMN IF NOT EXISTS \`source\` varchar(50) DEFAULT 'landing'`,

  // 7. Constraints (Safe if already exist but MySQL might throw error, so we wrap them)
  `ALTER TABLE \`forum_reply\` ADD CONSTRAINT \`forum_reply_thread_id_forum_thread_id_fk\` FOREIGN KEY (\`thread_id\`) REFERENCES \`forum_thread\`(\`id\`) ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE \`forum_reply\` ADD CONSTRAINT \`forum_reply_author_id_user_id_fk\` FOREIGN KEY (\`author_id\`) REFERENCES \`user\`(\`id\`) ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE \`forum_thread\` ADD CONSTRAINT \`forum_thread_author_id_user_id_fk\` FOREIGN KEY (\`author_id\`) REFERENCES \`user\`(\`id\`) ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE \`forum_thread\` ADD CONSTRAINT \`forum_thread_category_id_forum_category_id_fk\` FOREIGN KEY (\`category_id\`) REFERENCES \`forum_category\`(\`id\`) ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE \`forum_vote\` ADD CONSTRAINT \`forum_vote_user_id_user_id_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE \`forum_terms_agreement\` ADD CONSTRAINT \`forum_terms_agreement_user_id_user_id_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE no action ON UPDATE no action`
];

async function apply() {
  console.log('Applying SQL schema changes...');
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await db.execute(sql.raw(statement));
    } catch (e: any) {
      if (e.message.includes('already exists') || e.message.includes('Duplicate column')) {
        console.log('  -> Already exists, skipping.');
      } else {
        console.warn(`  -> Error: ${e.message}`);
      }
    }
  }
  console.log('Schema update finished!');
  process.exit(0);
}

apply();

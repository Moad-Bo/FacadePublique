import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function setup() {
    console.log('Ensuring tables exist...');
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` TEXT NOT NULL,
                \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "settings" checked/created.');

        await db.execute(sql`
            INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES 
            ('comm_quota_limit', '3000'),
            ('comm_quota_period', '30')
        `);

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS newsletter_template (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                subject TEXT NOT NULL,
                content TEXT NOT NULL,
                icon VARCHAR(50) DEFAULT 'i-lucide:mail',
                description TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "newsletter_template" checked/created.');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS newsletter_campaign (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                template_id VARCHAR(36),
                subject TEXT NOT NULL,
                content TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                sent_at TIMESTAMP NULL,
                total_recipients INT DEFAULT 0,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "newsletter_campaign" checked/created.');
        
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS email_queue (
                id varchar(36) PRIMARY KEY,
                \`to\` varchar(255) NOT NULL,
                subject text NOT NULL,
                html text NOT NULL,
                type varchar(20) DEFAULT 'manual',
                template varchar(50),
                status varchar(20) DEFAULT 'pending',
                scheduled_at timestamp NOT NULL,
                recurrence varchar(20) DEFAULT 'none',
                recurrence_value varchar(100),
                timezone varchar(50) DEFAULT 'Europe/Paris',
                error_message text,
                retry_count int DEFAULT 0,
                locked_at timestamp NULL,
                createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
                updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "email_queue" updated/checked.');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS system_template (
                id varchar(36) PRIMARY KEY,
                subject text NOT NULL,
                content text NOT NULL,
                description text,
                is_default boolean DEFAULT true,
                updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "system_template" created/checked.');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS newsletter_subscriber (
                \`id\` VARCHAR(36) PRIMARY KEY,
                \`email\` VARCHAR(255) NOT NULL UNIQUE,
                \`name\` TEXT,
                \`status\` VARCHAR(20) DEFAULT 'subscribed',
                \`subscribed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "newsletter_subscriber" checked/created.');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS email_log (
                \`id\` VARCHAR(36) PRIMARY KEY,
                \`to\` VARCHAR(255) NOT NULL,
                \`subject\` TEXT NOT NULL,
                \`template\` VARCHAR(50),
                \`type\` VARCHAR(20) DEFAULT 'system',
                \`status\` VARCHAR(20) DEFAULT 'sent',
                \`error_message\` TEXT,
                \`sent_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table "email_log" checked/created.');

    } catch (e) {
        console.error('Setup failed:', e);
    }
    process.exit(0);
}

setup();

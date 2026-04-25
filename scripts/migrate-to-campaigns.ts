import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('🚀 Starting migration: Newsletter -> Campaigns...');
  
  try {
    // 1. Rename tables
    console.log('📦 Renaming tables...');
    await db.execute(sql.raw('RENAME TABLE `newsletter_template` TO `campaign_template`'));
    await db.execute(sql.raw('RENAME TABLE `newsletter_campaign` TO `campaign`'));
    
    // 2. Add new columns to campaign
    console.log('➕ Adding new columns to campaign table...');
    await db.execute(sql.raw('ALTER TABLE `campaign` ADD COLUMN `type` varchar(20) DEFAULT "email" AFTER `name`'));
    await db.execute(sql.raw('ALTER TABLE `campaign` ADD COLUMN `sender_alias` varchar(50) AFTER `from_context`'));
    await db.execute(sql.raw('ALTER TABLE `campaign` ADD COLUMN `sender_domain` varchar(100) AFTER `sender_alias`'));
    
    // 3. Update defaults and status for existing rows
    console.log('🔄 Updating existing data defaults...');
    await db.execute(sql.raw('UPDATE `campaign` SET `type` = "email" WHERE `type` IS NULL'));
    
    // 4. Update foreign keys (if needed, Drizzle handles it but MySQL needs consistency)
    // Drizzle references are based on the names in code, but the DB constraints might need update
    // For safety, we keep existing IDs.
    
    console.log('✅ Migration finished successfully!');
  } catch (e: any) {
    if (e.message.includes("already exists") || e.message.includes("Unknown table")) {
        console.warn('⚠️ Migration already applied or tables already renamed.');
    } else {
        console.error('❌ Migration failed:', e.message);
    }
  }
  process.exit(0);
}

run();

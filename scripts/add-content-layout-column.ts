import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log('🔄 Adding content_layout_id to newsletter_campaign...');
        await db.execute(sql`ALTER TABLE newsletter_campaign ADD COLUMN content_layout_id VARCHAR(36) AFTER layout_id`);
        console.log('✅ Column content_layout_id added successfully.');
    } catch (e: any) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Column content_layout_id already exists.');
        } else {
            console.error('❌ Error:', e.message);
        }
    }
    process.exit(0);
}

run();

import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        await db.execute(sql`ALTER TABLE newsletter_campaign ADD COLUMN layout_id VARCHAR(36) DEFAULT 'newsletter' AFTER status`);
        console.log('✅ Column layout_id added successfully.');
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
}

run();

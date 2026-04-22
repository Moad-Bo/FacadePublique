import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log('Adding layout_id to mailbox...');
        await db.execute(sql`ALTER TABLE mailbox ADD COLUMN layout_id VARCHAR(36) DEFAULT "inbox" AFTER size`);
        console.log('✅ Column layout_id added successfully to mailbox.');
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
}

run();

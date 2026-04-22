import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        console.log('Adding columns to email_queue...');
        await db.execute(sql`ALTER TABLE email_queue ADD COLUMN cc TEXT AFTER subject`);
        await db.execute(sql`ALTER TABLE email_queue ADD COLUMN bcc TEXT AFTER cc`);
        console.log('✅ Columns cc and bcc added successfully to email_queue.');
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
}

run();

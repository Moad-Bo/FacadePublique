import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        await db.execute(sql`ALTER TABLE mailbox ADD COLUMN cc TEXT AFTER subject`);
        await db.execute(sql`ALTER TABLE mailbox ADD COLUMN bcc TEXT AFTER cc`);
        console.log('✅ Columns cc and bcc added successfully.');
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
}

run();

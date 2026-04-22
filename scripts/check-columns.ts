import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
    try {
        const [res] = await db.execute(sql`DESCRIBE newsletter_campaign`);
        console.log('Columns:', (res as any).map((c: any) => c.Field).join(', '));
    } catch (e: any) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

run();

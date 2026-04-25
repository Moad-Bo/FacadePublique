import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql.raw('ALTER TABLE `mailbox` ADD COLUMN IF NOT EXISTS `is_html` boolean DEFAULT false'));
    console.log('✓ Column is_html added to mailbox');
  } catch (e: any) {
    console.warn('Error:', e.message);
  }
  process.exit(0);
}
run();

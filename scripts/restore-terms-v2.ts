import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

const statements = [
  // 1. Remove cgu_accepted if it exists
  `ALTER TABLE \`user\` DROP COLUMN IF EXISTS \`cgu_accepted\``,
  
  // 2. Create terms_agreement table (renamed from forum_terms_agreement)
  `CREATE TABLE IF NOT EXISTS \`terms_agreement\` (
    \`id\` varchar(36) NOT NULL PRIMARY KEY,
    \`user_id\` varchar(36) NOT NULL,
    \`version\` varchar(10) NOT NULL DEFAULT 'v1',
    \`accepted_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // 3. Add foreign key index if needed (manual since we are using raw SQL for speed here)
  `CREATE INDEX IF NOT EXISTS \`idx_terms_user_id\` ON \`terms_agreement\` (\`user_id\`)`
];

async function apply() {
  console.log('--- TERMS RESTORATION MIGRATION V2 ---');
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement}`);
      await db.execute(sql.raw(statement));
    } catch (e: any) {
      console.error(`  -> Error: ${e.message}`);
    }
  }
  console.log('--- MIGRATION COMPLETE ---');
  process.exit(0);
}

apply();

import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

const statements = [
  // 1. Add cgu_accepted to user table
  `ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS \`cgu_accepted\` tinyint(1) DEFAULT 0`,
  
  // 2. We set them all to FALSE for now as requested (no migration of old data to stay safe)
  `UPDATE \`user\` SET \`cgu_accepted\` = 0`,
  
  // 3. Drop the old table
  `DROP TABLE IF EXISTS \`forum_terms_agreement\``
];

async function apply() {
  console.log('--- CGU REFACTOR MIGRATION ---');
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

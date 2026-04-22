import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';

const statements = [
  `ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS \`font_family\` varchar(50)`,
  `ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS \`font_size\` varchar(20)`,
  `ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS \`bio\` text`,
  `ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS \`quote\` varchar(255)`
];

async function apply() {
  console.log('Applying User Table updates for Profile Extensions...');
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement}`);
      await db.execute(sql.raw(statement));
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('  -> Column already exists, skipping.');
      } else {
        console.error(`  -> Error: ${e.message}`);
      }
    }
  }
  console.log('Update finished!');
  process.exit(0);
}

apply();

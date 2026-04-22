import { db } from '../server/utils/db';
import { emailLayout } from '../drizzle/src/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
  const layouts = await db.select().from(emailLayout);
  for (const l of layouts) {
    if (l.html.includes('{') || l.html.includes('}')) {
      console.log('--- FOUND IN: ' + l.id + ' (' + l.name + ') ---');
      // Look for standalone brackets or {{content}}
      const lines = l.html.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('{') || line.includes('}')) {
          console.log(i + ': ' + line.trim());
        }
      });
    }
  }
  process.exit(0);
}

debug();

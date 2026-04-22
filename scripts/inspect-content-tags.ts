import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
  const caPath = process.env.MYSQL_SSL_CA;
  let caCert = undefined;
  if (caPath) {
    try {
      const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
      caCert = fs.readFileSync(fullPath, 'utf8');
    } catch (e: any) { }
  }

  const poolConnection = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: caCert ? { rejectUnauthorized: true, ca: caCert } : undefined
  });

  const [rows]: any = await poolConnection.query("SELECT id, html FROM email_layout WHERE category = 'content_layout'");
  
  for (const l of rows) {
     console.log(`--- ${l.id} ---`);
     // Find all matches for {{...}}
     const matches = l.html.match(/{{[^{}]+}}/g);
     console.log('Placeholders found:', matches ? [...new Set(matches)] : 'None');
  }
  process.exit(0);
}

check();

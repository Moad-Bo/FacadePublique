import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
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

  const [rows]: any = await poolConnection.query("SELECT id, name, html FROM email_layout");
  
  for (const l of rows) {
    if (l.html.includes('{{content}}')) {
      console.log('--- CONTEXT IN: ' + l.id + ' (' + l.name + ') ---');
      const lines = l.html.split('\n');
      const index = lines.findIndex(line => line.includes('{{content}}'));
      if (index !== -1) {
        // Log 3 lines before and after
        for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i++) {
          console.log(i + ': ' + lines[i].trim());
        }
      }
    }
  }
  process.exit(0);
}

debug();

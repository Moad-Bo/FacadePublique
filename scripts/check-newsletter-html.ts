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

  const [rows]: any = await poolConnection.query("SELECT id, name, html FROM email_layout WHERE id = 'newsletter'");
  if (rows.length > 0) {
    console.log(rows[0].html);
  }
  process.exit(0);
}
// Note: forgot to create the poolConnection variable in my previous scratchpad attempt too! Fixed here.

async function checkFix() {
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
  
    const [rows]: any = await poolConnection.query("SELECT id, name, html FROM email_layout WHERE id = 'newsletter'");
    if (rows.length > 0) {
      console.log(rows[0].html);
    }
    process.exit(0);
}
checkFix();

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function cleanup() {
  console.log('🧹 Cleaning up layout brackets...');

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
  
  let updatedCount = 0;
  for (const l of rows) {
    let newHtml = l.html;
    
    // Pattern 1: Standalone { on a line
    // Look for lines that only contain { (handles both LF and CRLF)
    const originalLength = newHtml.length;
    
    // Regex for standalone { or } on a line, potentially with whitespace
    // We specifically want to avoid breaking CSS or JSON strings, 
    // but the user wants them gone from the renderable body area.
    
    // Targeted removal: brackets that are literally surrounded by newlines or tags
    // commonly found in the content area.
    newHtml = newHtml.replace(/^\s*{\s*$/gm, '');
    newHtml = newHtml.replace(/^\s*}\s*$/gm, '');
    
    // Also handle cases like <p>{</p> or <div>}</div>
    newHtml = newHtml.replace(/>\s*{\s*</g, '><');
    newHtml = newHtml.replace(/>\s*}\s*</g, '><');

    if (newHtml !== l.html) {
      console.log(`✨ Cleaning: ${l.name} (${l.id})`);
      await poolConnection.query("UPDATE email_layout SET html = ? WHERE id = ?", [newHtml, l.id]);
      updatedCount++;
    }
  }

  console.log(`✅ Cleanup complete. ${updatedCount} layouts updated.`);
  process.exit(0);
}

cleanup();

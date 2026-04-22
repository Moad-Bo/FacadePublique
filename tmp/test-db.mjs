import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function test(host, user, pass, db, caPath) {
  console.log(`TEST: ${host} | User: ${user} | Pass: ${pass ? 'YES' : 'NO'}`);
  try {
    const conn = await mysql.createConnection({
      host, port: 4000, user, password: pass, database: db,
      ssl: (caPath && fs.existsSync(caPath)) ? { ca: fs.readFileSync(caPath, 'utf8') } : undefined,
      connectTimeout: 8000
    });
    const [rows] = await conn.query('SELECT 1 as connected');
    console.log('SUCCESS!', rows);
    await conn.end();
    return true;
  } catch (e) {
    console.log('FAIL:', e.message);
    return false;
  }
}

const host = process.env.MYSQL_HOST;
const user = process.env.MYSQL_USER;
const pass = process.env.MYSQL_PASSWORD;
const db = process.env.MYSQL_DATABASE;
const ca = process.env.MYSQL_SSL_CA;

test(host, user, pass, db, ca).then(() => process.exit(0)).catch(() => process.exit(1));

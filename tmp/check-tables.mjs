import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: 4000,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 8000
  });
  console.log('--- SHOW TABLES ---');
  const [tables] = await conn.query('SHOW TABLES');
  console.log(tables);
  
  console.log('--- DESCRIBE email_queue ---');
  try {
    const [desc] = await conn.query('DESCRIBE email_queue');
    console.log(desc);
  } catch (e) {
    console.log('Error describing email_queue:', e.message);
  }
  
  await conn.end();
}

check().catch(e => { console.error('FAIL:', e); process.exit(1); });

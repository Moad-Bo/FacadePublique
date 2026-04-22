import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: 4000, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
    ssl: { ca: fs.readFileSync(process.env.MYSQL_SSL_CA, 'utf8') },
  });

  console.log('Renaming columns...');
  try {
    await conn.query('ALTER TABLE email_queue CHANGE `to` recipient varchar(255) NOT NULL');
    console.log('SUCCESS: email_queue.to -> recipient');
    await conn.query('ALTER TABLE email_log CHANGE `to` recipient varchar(255) NOT NULL');
    console.log('SUCCESS: email_log.to -> recipient');
  } catch (e) {
    console.error('FAIL:', e.message);
  }
  await conn.end();
}
run();

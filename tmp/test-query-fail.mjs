import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: 4000,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { ca: fs.readFileSync(process.env.MYSQL_SSL_CA, 'utf8') },
  });

  console.log('Executing failing query...');
  try {
    const sql = "select id, `to`, subject, html, type, template, status, scheduled_at, recurrence, recurrence_value, timezone, error_message, retry_count, locked_at, createdAt, updatedAt from email_queue where (email_queue.scheduled_at <= ? and (email_queue.status = ? or (email_queue.status = ? and email_queue.locked_at <= ?)) and email_queue.retry_count < ?) limit ?";
    const params = [new Date(), 'pending', 'locked', new Date(Date.now() - 300000), 3, 10];
    
    const [rows] = await conn.query(sql, params);
    console.log('SUCCESS! Rows found:', rows.length);
  } catch (e) {
    console.error('REAL MYSQL ERROR:', e.message);
    console.error('ERROR CODE:', e.code);
  }
  await conn.end();
}
run();

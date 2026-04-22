import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const pass = process.env.MYSQL_PASSWORD;
  const db = process.env.MYSQL_DATABASE;
  const caPath = process.env.MYSQL_SSL_CA;

  console.log(`Checking DB: ${host} | SSL CA: ${caPath}`);
  
  const conn = await mysql.createConnection({
    host, port: 4000, user, password: pass, database: db,
    ssl: { ca: fs.readFileSync(caPath, 'utf8') },
    connectTimeout: 8000
  });

  const [tables] = await conn.query('SHOW TABLES');
  console.log('Tables:', tables.map(t => Object.values(t)[0]));
  
  if (tables.some(t => Object.values(t)[0] === 'email_queue')) {
    const [desc] = await conn.query('DESCRIBE email_queue');
    console.log('--- email_queue structure ---');
    console.log(desc);
  } else {
    console.log('!!! email_queue table NOT FOUND !!!');
  }
  
  await conn.end();
}
check().catch(e => console.error('FAIL:', e.message));

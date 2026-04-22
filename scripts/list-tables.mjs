import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const caPath = process.env.MYSQL_SSL_CA;
let caCert;
if (caPath) {
  const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
  caCert = fs.readFileSync(fullPath, 'utf8');
}

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: caCert ? { rejectUnauthorized: true, ca: caCert } : undefined,
});

const [tables] = await conn.query('SHOW TABLES');
console.log('Tables en BDD:', tables.map(t => Object.values(t)[0]).sort().join('\n'));
await conn.end();

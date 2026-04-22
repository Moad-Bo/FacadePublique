/**
 * check-mailbox.mjs — Inspection du contenu de la table mailbox
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const caPath = process.env.MYSQL_SSL_CA;
const ca = caPath ? fs.readFileSync(path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath), 'utf8') : undefined;

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: ca ? { rejectUnauthorized: true, ca } : undefined,
});

console.log('=== Résumé mailbox (20 derniers, tous) ===');
const [rows] = await conn.query(
  'SELECT id, from_email, subject, category, to_account, unread, DATE_FORMAT(date, "%Y-%m-%d %H:%i") as date FROM mailbox ORDER BY date DESC LIMIT 20'
);
console.table(rows);

console.log('\n=== Mails avec from_email contenant "moad" ===');
const [moads] = await conn.query(
  "SELECT id, from_email, subject, category, to_account FROM mailbox WHERE from_email LIKE '%moad%' OR subject LIKE '%holla%'"
);
console.table(moads);

console.log('\n=== Catégories et comptes présents ===');
const [cats] = await conn.query('SELECT category, to_account, COUNT(*) as count FROM mailbox GROUP BY category, to_account');
console.table(cats);

await conn.end();

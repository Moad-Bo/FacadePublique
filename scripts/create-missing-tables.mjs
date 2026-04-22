/**
 * create-missing-tables.mjs
 * Crée les tables présentes dans schema.ts mais absentes de la BDD :
 *   audience, ticket, ticket_message, private_message
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const caPath = process.env.MYSQL_SSL_CA;
const fullCaPath = caPath ? (path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath)) : null;
const caCert = fullCaPath ? fs.readFileSync(fullCaPath, 'utf8') : undefined;

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: caCert ? { rejectUnauthorized: true, ca: caCert } : undefined,
});

const tables = [
  {
    name: 'audience',
    sql: `CREATE TABLE IF NOT EXISTS \`audience\` (
      \`id\` varchar(36) NOT NULL,
      \`email\` varchar(255) NOT NULL,
      \`user_id\` varchar(36) DEFAULT NULL,
      \`opt_in_newsletter\` tinyint(1) DEFAULT 0,
      \`opt_in_marketing\` tinyint(1) DEFAULT 0,
      \`opt_in_forum\` tinyint(1) DEFAULT 1,
      \`source\` varchar(50) DEFAULT 'landing',
      \`unsubscribed_at\` timestamp NULL DEFAULT NULL,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`audience_email_unique\` (\`email\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'ticket',
    sql: `CREATE TABLE IF NOT EXISTS \`ticket\` (
      \`id\` varchar(36) NOT NULL,
      \`user_id\` varchar(36) NOT NULL,
      \`subject\` varchar(255) NOT NULL,
      \`status\` varchar(20) DEFAULT 'open',
      \`priority\` varchar(20) DEFAULT 'medium',
      \`category\` varchar(50) DEFAULT 'general',
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'ticket_message',
    sql: `CREATE TABLE IF NOT EXISTS \`ticket_message\` (
      \`id\` varchar(36) NOT NULL,
      \`ticket_id\` varchar(36) NOT NULL,
      \`sender_id\` varchar(36) NOT NULL,
      \`body\` text NOT NULL,
      \`is_admin\` tinyint(1) DEFAULT 0,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
  {
    name: 'private_message',
    sql: `CREATE TABLE IF NOT EXISTS \`private_message\` (
      \`id\` varchar(36) NOT NULL,
      \`from_id\` varchar(36) NOT NULL,
      \`to_id\` varchar(36) NOT NULL,
      \`content\` text NOT NULL,
      \`is_read\` tinyint(1) DEFAULT 0,
      \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },
];

console.log('🔨 Création des tables manquantes...');
for (const t of tables) {
  try {
    await conn.query(t.sql);
    console.log(`  ✅ Table OK: ${t.name}`);
  } catch (e) {
    console.error(`  ❌ ${t.name}:`, e.message);
  }
}

await conn.end();
console.log('\n✅ Terminé.');

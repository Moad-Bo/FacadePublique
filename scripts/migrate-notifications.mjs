/**
 * scripts/migrate-notifications.mjs
 *
 * Migration manuelle (One-shot) pour créer les tables du système de notification
 * et de modération sans drizzle-kit push (pour TiDB compatibilité).
 *
 * Usage : node scripts/migrate-notifications.mjs
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ DATABASE_URL manquante dans .env');
  process.exit(1);
}

const conn = await createConnection(DB_URL);

const statements = [
  // ── Table notification ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`notification\` (
    \`id\` varchar(36) NOT NULL,
    \`user_id\` varchar(36) DEFAULT NULL,
    \`target_role\` varchar(50) DEFAULT NULL,
    \`type\` varchar(50) NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`body\` text DEFAULT NULL,
    \`action_url\` text DEFAULT NULL,
    \`is_read\` tinyint(1) DEFAULT '0',
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_notif_user_read\` (\`user_id\`, \`is_read\`),
    KEY \`idx_notif_role\` (\`target_role\`),
    CONSTRAINT \`notification_user_id_fk\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;`,

  // ── Table moderation_log ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`moderation_log\` (
    \`id\` varchar(36) NOT NULL,
    \`reported_by\` varchar(36) NOT NULL,
    \`target_type\` varchar(20) NOT NULL,
    \`target_id\` varchar(36) NOT NULL,
    \`reason\` varchar(100) NOT NULL,
    \`details\` text DEFAULT NULL,
    \`status\` varchar(20) DEFAULT 'pending',
    \`resolved_by\` varchar(36) DEFAULT NULL,
    \`resolved_at\` timestamp NULL DEFAULT NULL,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_modlog_status\` (\`status\`),
    CONSTRAINT \`modlog_reported_by_fk\` FOREIGN KEY (\`reported_by\`) REFERENCES \`user\` (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;`,

  // ── Ajout colonne is_reported sur forum_thread ─────────────────────────────
  `ALTER TABLE \`forum_thread\` 
    ADD COLUMN IF NOT EXISTS \`is_reported\` tinyint(1) DEFAULT '0';`,

  // ── Ajout colonne is_reported sur forum_reply ──────────────────────────────
  `ALTER TABLE \`forum_reply\` 
    ADD COLUMN IF NOT EXISTS \`is_reported\` tinyint(1) DEFAULT '0';`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    const label = sql.trim().split('\n')[0].substring(0, 80);
    console.log(`✅ OK: ${label}...`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
      // Déjà présent — pas un problème
      console.log(`ℹ️  Déjà existant (skip): ${e.sqlMessage}`);
    } else {
      console.error(`❌ Erreur:`, e.message);
      // On continue les autres statements même en cas d'erreur non fatale
    }
  }
}

await conn.end();
console.log('\n🎉 Migration terminée.');

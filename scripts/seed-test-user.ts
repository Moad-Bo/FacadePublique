import 'dotenv/config';
import { db } from '../server/utils/db';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('🌱 Création du compte membre moad.bo@proton.me...');
  
  const userId = randomUUID();
  const email = 'moad.bo@proton.me';
  
  try {
    // 1. Création de la table newsletter_subscriber si elle n'existe pas
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`newsletter_subscriber\` (
        \`id\` varchar(36) PRIMARY KEY,
        \`email\` varchar(255) NOT NULL UNIQUE,
        \`name\` text,
        \`status\` varchar(20) DEFAULT 'subscribed',
        \`subscribed_at\` timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Suppression de l'utilisateur existant
    await db.execute(sql`DELETE FROM \`user\` WHERE \`email\` = ${email}`);
    
    // 3. Insertion utilisateur (Correcting column names to camelCase as per DB)
    await db.execute(sql`
      INSERT INTO \`user\` (id, name, email, emailVerified, role, createdAt, updatedAt)
      VALUES (${userId}, 'Moad Member', ${email}, 1, 'membre', NOW(), NOW())
    `);

    // 4. Inscription Newsletter
    await db.execute(sql`DELETE FROM \`newsletter_subscriber\` WHERE \`email\` = ${email}`);
    const subId = randomUUID();
    await db.execute(sql`
      INSERT INTO \`newsletter_subscriber\` (id, email, name, status, subscribed_at)
      VALUES (${subId}, ${email}, 'Moad Member', 'subscribed', NOW())
    `);

    console.log('✅ Utilisateur et abonné newsletter créés avec succès !');
  } catch (e) {
    console.error('❌ Erreur:', e);
  }
  process.exit();
}

seed();

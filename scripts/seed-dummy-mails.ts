import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { mailbox, mailboxAttachment } from '../drizzle/src/db/schema.ts';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function main() {
  const caPath = process.env.MYSQL_SSL_CA;
  let caCert = undefined;

  if (caPath) {
      try {
          const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
          caCert = fs.readFileSync(fullPath, 'utf8');
      } catch (e) {
          console.error("Erreur lecture SSL CA:", e.message);
      }
  }

  const poolConnection = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: caCert ? {
          rejectUnauthorized: true,
          ca: caCert,
      } : undefined,
  });

  const db = drizzle(poolConnection, { mode: 'default' });

  const dummyMails = [];
  const dummyAttachments = [];
  
  for(let i=0; i<15; i++) {
    const mailId = uuidv4();
    dummyMails.push({
      id: mailId,
      toAccount: i % 3 === 0 ? 'noreply' : (i % 3 === 1 ? 'newsletter' : 'contact'),
      fromName: `Utilisateur ${i}`,
      fromEmail: `user${i}@example.com`,
      subject: `Sujet de test ${i} - Bonjour !`,
      body: `Contenu du message numéro ${i}. Ceci est un mail de test généré automatiquement.\n\nCordialement,\nUtilisateur ${i}`,
      date: new Date(Date.now() - Math.random() * 10000000000),
      unread: Math.random() > 0.5,
      starred: Math.random() > 0.8,
      trashed: false,
      archived: false,
      folderId: 'inbox',
      category: 'received',
      size: Math.floor(Math.random() * 50000) + 1000,
    });

    // Add attachments to some mails
    if (i % 4 === 0) {
      const attId = uuidv4();
      dummyAttachments.push({
        id: attId,
        mailboxId: mailId,
        filename: `document_test_${i}.txt`,
        mimeType: 'text/plain',
        size: Math.floor(Math.random() * 10000) + 500,
        s3Key: `attachments/seed/test_file_${i}.txt`,
      });
    }
  }

  console.log('Seeding dummy mails and attachments...');
  for (const m of dummyMails) {
    try {
      await db.insert(mailbox).values(m);
      console.log(`✅ Seeded mail ${m.id}`);
    } catch (e) {
      console.error(`❌ Failed to seed mail ${m.id}:`, e.message);
    }
  }

  for (const a of dummyAttachments) {
    try {
      await db.insert(mailboxAttachment).values(a);
      console.log(`✅ Seeded attachment ${a.filename} for mail ${a.mailboxId}`);
    } catch (e) {
      console.error(`❌ Failed to seed attachment ${a.id}:`, e.message);
    }
  }

  console.log('✅ Seed completed.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { systemTemplate } from '../drizzle/src/db/schema.ts';
import dotenv from 'dotenv';

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

  const templatesToSeed = [
    {
      id: 'verify_email',
      description: 'Template envoyé pour la vérification de compte',
      subject: 'Vérifiez votre adresse email',
      content: '<h2>Bienvenue sur Techknè !</h2><p>Veuillez cliquer sur le lien suivant pour vérifier votre adresse email : <br><br> <a href="{url}">Vérifier mon email</a></p>',
      layoutId: 'system',
      isDefault: true
    },
    {
      id: 'reset_password',
      description: 'Template envoyé pour réinitialiser le mot de passe',
      subject: 'Réinitialisation de votre mot de passe',
      content: '<h2>Réinitialisation demandée</h2><p>Cliquez sur ce lien pour choisir un nouveau mot de passe : <br><br> <a href="{url}">Réinitialiser</a></p>',
      layoutId: 'system',
      isDefault: true
    },
    {
      id: 'welcome_email',
      description: 'Template envoyé après inscription réussie',
      subject: 'Bienvenue sur Techknè',
      content: '<h2>Inscription réussie !</h2><p>Merci de nous avoir rejoints. Explorez nos services dès maintenant.</p>',
      layoutId: 'system',
      isDefault: true
    }
  ];

  console.log('Seeding system templates...');
  for (const tpl of templatesToSeed) {
    try {
      await db.insert(systemTemplate).values(tpl).onDuplicateKeyUpdate({
        set: { subject: tpl.subject, content: tpl.content }
      });
      console.log(`✅ Seeded template: ${tpl.id}`);
    } catch (e) {
      console.error(`❌ Failed to seed ${tpl.id}:`, e.message);
    }
  }

  console.log('Seed completed.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { emailLayout } from '../drizzle/src/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
  console.log('🚀 Seeding Content Layouts...');

  const caPath = process.env.MYSQL_SSL_CA;
  let caCert = undefined;

  if (caPath) {
    try {
      const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
      caCert = fs.readFileSync(fullPath, 'utf8');
    } catch (e: any) {
      console.error('Erreur lecture SSL CA:', e.message);
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
    } : undefined
  });

  const db = drizzle(poolConnection);

  const layouts = [
    {
      id: 'content_card_hello',
      name: 'Hello Card',
      category: 'content_layout',
      description: 'A simple centered card with a greeting.',
      html: '<div style="background: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-width: 500px; margin: 20px auto; text-align: center;">\n' +
            '  <div style="width: 60px; height: 60px; background: #6366f1; border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px;">\n' +
            '    👋\n' +
            '  </div>\n' +
            '  <h2 style="margin: 0 0 10px; color: #1e293b; font-family: sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Bonjour !</h2>\n' +
            '  <div style="color: #64748b; font-family: sans-serif; line-height: 1.6; font-size: 16px;">\n' +
            '    {{content}}\n' +
            '  </div>\n' +
            '</div>',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'content_modern_grid',
      name: 'Modern Grid',
      category: 'content_layout',
      description: 'A clean 2-column grid layout for structured content.',
      html: '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-family: sans-serif;">\n' +
            '  <div style="background: white; border-radius: 20px; padding: 25px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">\n' +
            '     <h4 style="margin: 0 0 8px; color: #6366f1; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">Section Gauche</h4>\n' +
            '     <div style="color: #334155; font-size: 14px; line-height: 1.5;">\n' +
            '        {{content}}\n' +
            '     </div>\n' +
            '  </div>\n' +
            '  <div style="background: #f8fafc; border-radius: 20px; padding: 25px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">\n' +
            '     <p style="text-align: center; color: #94a3b8; font-size: 13px; font-weight: 500; font-style: italic;">\n' +
            '        Espace média ou contenu secondaire\n' +
            '     </p>\n' +
            '  </div>\n' +
            '</div>',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  try {
    for (const layout of layouts) {
      console.log('📦 Inserting layout: ' + layout.name);
      await db.insert(emailLayout).values(layout as any).onDuplicateKeyUpdate({
        set: {
            name: layout.name,
            html: layout.html,
            description: layout.description,
            category: layout.category
        }
      });
    }
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();

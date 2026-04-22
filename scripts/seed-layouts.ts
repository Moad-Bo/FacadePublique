import 'dotenv/config';
import { db } from '../server/utils/db';
import { emailLayout } from '../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
    console.log('🌱 Seeding nouveaux layouts par défaut...');

    const layouts = [
        {
            id: 'notification',
            name: 'Layout Notifications Standard',
            category: 'notification',
            description: 'Design épuré pour les alertes plateforme et notifications utilisateurs.',
            isDefault: true,
            html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; margin: 0; padding: 40px 20px; }
    .card { max-width: 550px; margin: 0 auto; background: white; border-top: 4px solid #3b82f6; border-radius: 12px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .logo { color: #3b82f6; font-size: 24px; font-weight: bold; margin-bottom: 30px; }
    .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 11px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Techknè App</div>
    {{{body}}}
  </div>
  <div class="footer">Vous recevez cet email car vous avez activé les notifications.</div>
</body>
</html>`
        },
        {
            id: 'mod-forum',
            name: 'Layout Modération Forum',
            category: 'mod-forum',
            description: 'Design formel pour les avertissements et actions de modération.',
            isDefault: true,
            html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #fef2f2; margin: 0; padding: 40px 20px; }
    .card { max-width: 600px; margin: 0 auto; background: white; border-top: 4px solid #ef4444; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { color: #ef4444; font-size: 18px; font-weight: bold; margin-bottom: 25px; border-bottom: 1px solid #fee2e2; padding-bottom: 10px; }
    .footer { text-align: center; margin-top: 30px; color: #991b1b; font-size: 11px; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">🛡️ MODÉRATION TECHKNÈ</div>
    {{{body}}}
  </div>
  <div class="footer">Cet email concerne une action de modération liée à votre compte.</div>
</body>
</html>`
        }
    ];

    try {
        for (const l of layouts) {
            const [existing] = await db.select().from(emailLayout).where(eq(emailLayout.id, l.id));
            if (existing) {
                console.log(`Updating layout ${l.id}...`);
                await db.update(emailLayout).set(l).where(eq(emailLayout.id, l.id));
            } else {
                console.log(`Inserting layout ${l.id}...`);
                await db.insert(emailLayout).values(l);
            }
        }
        console.log('✅ Layouts terminés.');
    } catch (e: any) {
        console.error('❌ Erreur:', e.message);
    }
    process.exit(0);
}

seed();

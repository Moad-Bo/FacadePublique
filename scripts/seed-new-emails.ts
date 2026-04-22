import 'dotenv/config';
import { db } from './server/utils/db';
import { mailbox, emailLog } from './drizzle/src/db/schema';
import { randomUUID } from 'crypto';

async function seed() {
    console.log('🌱 Seeding nouveaux emails (@mail.techkne.fr)...');

    const accounts = ['contact', 'mod-forum'];
    const logs = [
        { type: 'system', recipient: 'user@example.com', subject: 'Bienvenue sur Techknè' },
        { type: 'newsletter', recipient: 'subscriber@gmail.com', subject: 'Newsletter Hebdo #42' },
        { type: 'notification', recipient: 'moad.bo@proton.me', subject: 'Nouveau message sur votre thread' },
        { type: 'contact', recipient: 'client@company.com', subject: 'Demande de devis' },
        { type: 'mod-forum', recipient: 'spammer@temp.com', subject: 'Avertissement de modération' }
    ];

    try {
        // Seed some inbox messages for Webmailer
        for (const account of accounts) {
            for (let i = 1; i <= 3; i++) {
                await db.insert(mailbox).values({
                    id: randomUUID(),
                    userId: 'user_dummy_id', // Adjust if needed or keep as string for local tests
                    fromName: `Expéditeur ${i}`,
                    fromEmail: `sender${i}@example.com`,
                    subject: `Message de test ${i} pour ${account}`,
                    body: `<p>Ceci est le corps du message ${i} reçu sur <strong>${account}@mail.techkne.fr</strong>.</p>`,
                    toAccount: account,
                    category: 'inbox',
                    unread: i === 1,
                    date: new Date(Date.now() - i * 3600000)
                });
            }
        }

        // Seed some logs
        for (const l of logs) {
            await db.insert(emailLog).values({
                id: randomUUID(),
                recipient: l.recipient,
                subject: l.subject,
                type: l.type as any,
                status: 'sent',
                sentAt: new Date(Date.now() - Math.random() * 86400000)
            });
        }

        console.log('✅ Seeding terminé.');
    } catch (e: any) {
        console.error('❌ Erreur seeding:', e.message);
    }
    process.exit(0);
}

seed();

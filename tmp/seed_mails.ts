import { db } from '../server/utils/db';
import { mailbox, user } from '../drizzle/src/db/schema';
import { randomUUID } from 'crypto';

async function seed() {
    try {
        console.log('Seeding mails...');
        
        // 1. Get the first user
        const users = await db.select().from(user).limit(1);
        if (users.length === 0) {
            console.error('No users found in DB. Please create a user first.');
            process.exit(1);
        }
        const userId = users[0].id;
        console.log(`Using userId: ${userId}`);

        const mails = [];

        // 1. 5 mails de User 14
        const user14Subjects = [
            "Question sur le dev",
            "Rapport hebdomadaire",
            "Invitation meeting",
            "Besoin d'aide",
            "Félicitations pour le déploiement"
        ];
        user14Subjects.forEach((sub, i) => {
            mails.push({
                id: randomUUID(),
                userId,
                toAccount: 'contact',
                fromEmail: 'user14@example.com',
                fromName: 'Utilisateur 14',
                subject: sub,
                body: `Ceci est le corps du message pour: ${sub}.`,
                date: new Date(Date.now() - (i * 3600000 * 24)), // One per day
                category: 'contact',
                unread: i === 0,
                size: 1000 + (i * 250)
            });
        });

        // 2. 4 Conversations (Threads)
        const conversations = [
            { subject: "Refonte UI", counts: 3, froms: ['alice@dev.com', 'bob@dev.com', 'charlie@dev.com'] },
            { subject: "Bug production #99", counts: 2, froms: ['ops@infra.net', 'lead@team.com'] },
            { subject: "Planning vacances", counts: 4, froms: ['hr@company.com', 'moad@techkne.fr', 'hr@company.com', 'manager@team.com'] },
            { subject: "Update API", counts: 2, froms: ['dev1@tech.com', 'dev2@tech.com'] }
        ];

        conversations.forEach((conv, cIdx) => {
            for (let i = 0; i < conv.counts; i++) {
                const prefix = i === 0 ? '' : 'Re: ';
                mails.push({
                    id: randomUUID(),
                    userId,
                    toAccount: 'contact',
                    fromEmail: conv.froms[i % conv.froms.length],
                    fromName: conv.froms[i % conv.froms.length].split('@')[0],
                    subject: prefix + conv.subject,
                    body: `Réponse #${i} dans la discussion sur ${conv.subject}.`,
                    date: new Date(Date.now() - (cIdx * 7200000) - (i * 300000)), // Grouped in time
                    category: 'contact',
                    unread: i === conv.counts - 1,
                    size: 1500 + (cIdx * 100) + (i * 50)
                });
            }
        });

        // 3. 4 mails random
        const randoms = [
            { from: 'security@bank.fr', name: 'Alerte Sécurité', sub: 'Connexion suspecte' },
            { from: 'delivery@fedex.com', name: 'FedEx', sub: 'Votre colis est en route' },
            { from: 'newsletter@news.io', name: 'Daily Tech', sub: 'Les news du jour' },
            { from: 'friend@gmail.com', name: 'Marc', sub: 'On se voit quand ?' }
        ];

        randoms.forEach((r, i) => {
            mails.push({
                id: randomUUID(),
                userId,
                toAccount: 'contact',
                fromEmail: r.from,
                fromName: r.name,
                subject: r.sub,
                body: `Message aléatoire de ${r.name} sur ${r.sub}.`,
                date: new Date(Date.now() - (10 * 3600000) - (i * 1800000)),
                category: i === 2 ? 'newsletter' : 'contact',
                unread: true,
                size: 800 + (i * 700)
            });
        });

        console.log(`Inserting ${mails.length} mails...`);
        for (const mail of mails) {
            await db.insert(mailbox).values(mail);
            console.log(`Inserted mail: ${mail.subject}`);
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding mails:', error);
        process.exit(1);
    }
}

seed();

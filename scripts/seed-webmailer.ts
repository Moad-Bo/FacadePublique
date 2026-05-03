import { db } from "../server/utils/db";
import { mailbox, user } from "../drizzle/src/db/schema";
import { randomUUID } from "crypto";

async function main() {
  console.log("Fetching a valid user to assign the seeded mails...");
  const users = await db.select().from(user).limit(1);
  if (users.length === 0) {
    console.error("No users found to assign the mails.");
    process.exit(1);
  }
  const targetUser = users[0];

  const accounts = ['contact', 'moderation', 'support'];
  const subjects = [
    "Demande d'informations complémentaires",
    "Signalement de comportement inapproprié",
    "Problème technique sur mon compte",
    "Question sur la facturation",
    "Suggestion d'amélioration",
    "Candidature spontanée",
    "Demande de partenariat",
    "Aide pour l'utilisation de l'API"
  ];

  const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const emailsToInsert = [];

  for (let i = 0; i < 50; i++) {
    const isUnread = Math.random() > 0.5;
    const isHtml = Math.random() > 0.5;
    
    emailsToInsert.push({
      id: randomUUID(),
      userId: targetUser.id,
      fromName: `Expéditeur Seed ${i + 1}`,
      fromEmail: `expediteur${i + 1}@example.com`,
      subject: `[Seed] ${getRandom(subjects)}`,
      body: isHtml 
        ? `<p>Bonjour,</p><p>Ceci est un message de <strong>test généré automatiquement</strong>.</p><p>Cordialement,<br>Expéditeur ${i + 1}</p>`
        : `Bonjour,\n\nCeci est un message de test généré automatiquement.\n\nCordialement,\nExpéditeur ${i + 1}`,
      isHtml,
      toAccount: getRandom(accounts),
      category: 'inbox',
      unread: isUnread,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within the last 30 days
      size: Math.floor(Math.random() * 5000) + 1000 // random size between 1kb and 6kb
    });
  }

  console.log(`Seeding 50 emails into the mailbox for user ${targetUser.email}...`);
  await db.insert(mailbox).values(emailsToInsert);
  
  console.log("✅ Successfully seeded 50 emails.");
  process.exit(0);
}

main().catch(console.error);

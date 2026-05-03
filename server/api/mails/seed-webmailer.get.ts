import { defineEventHandler } from 'h3';
import { db } from '../../utils/db';
import { mailbox, user } from '../../../drizzle/src/db/schema';
import { randomUUID } from 'crypto';

export default defineEventHandler(async () => {
  const users = await db.select().from(user).limit(1);
  if (users.length === 0) {
    return { success: false, message: 'No users found' };
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
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      size: Math.floor(Math.random() * 5000) + 1000
    });
  }

  await db.insert(mailbox).values(emailsToInsert);

  return { success: true, message: '50 emails seeded successfully' };
});

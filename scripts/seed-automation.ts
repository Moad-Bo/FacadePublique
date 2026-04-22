import 'dotenv/config';
import { db } from '../server/utils/db';
import { systemTemplate } from '../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
    console.log('🌱 Seeding templates d\'automatisation (Notifications)...');

    const templates = [
        {
            id: 'mention',
            subject: 'Vous avez été mentionné dans une discussion',
            content: `
                <p>Bonjour {user},</p>
                <p><strong>{notifier}</strong> vous a mentionné dans le sujet : <a href="{thread_url}">{thread_title}</a>.</p>
                <blockquote style="border-left: 4px solid #6366f1; padding-left: 15px; color: #4b5563; font-style: italic;">
                    "{comment_content}"
                </blockquote>
                <p><a href="{thread_url}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Voir la discussion</a></p>
                <p>À bientôt,<br>L'équipe Techknè</p>
            `,
            description: 'Envoyé lorsqu\'un utilisateur est mentionné (@username) dans un commentaire.',
            layoutId: 'notification'
        },
        {
            id: 'reply',
            subject: 'Nouvelle réponse à votre sujet',
            content: `
                <p>Bonjour {user},</p>
                <p><strong>{notifier}</strong> a répondu à votre sujet : <a href="{thread_url}">{thread_title}</a>.</p>
                <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
                    {comment_content}
                </div>
                <p><a href="{thread_url}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Répondre</a></p>
                <p>À bientôt,<br>L'équipe Techknè</p>
            `,
            description: 'Envoyé à l\'auteur d\'un sujet lorsqu\'un nouveau commentaire est posté.',
            layoutId: 'notification'
        },
        {
            id: 'status_changed',
            subject: 'Mise à jour du statut de votre demande',
            content: `
                <p>Bonjour {user},</p>
                <p>Le statut de votre discussion <strong>{thread_title}</strong> a été mis à jour.</p>
                <p>Nouveau statut : <strong style="color: #6366f1;">{status}</strong></p>
                <p>Vous pouvez consulter les détails ici : <a href="{thread_url}">{thread_url}</a>.</p>
                <p>Cordialement,<br>L'équipe Techknè</p>
            `,
            description: 'Envoyé lorsque le statut d\'un thread ou d\'un ticket change.',
            layoutId: 'notification'
        },
        {
            id: 'trendy',
            subject: 'Félicitations ! Votre sujet est tendance 📈',
            content: `
                <p>Bonjour {user},</p>
                <p>Votre sujet <strong>{thread_title}</strong> connaît un grand succès sur la plateforme !</p>
                <p>Il est actuellement parmi les plus consultés de la semaine. Bravo pour votre contribution.</p>
                <p><a href="{thread_url}">Continuer à suivre la discussion</a></p>
                <p>L'équipe Techknè</p>
            `,
            description: 'Envoyé lorsque la popularité d\'un sujet dépasse un certain seuil.',
            layoutId: 'notification'
        }
    ];

    try {
        for (const t of templates) {
            const [existing] = await db.select().from(systemTemplate).where(eq(systemTemplate.id, t.id));
            if (existing) {
                console.log(`Updating ${t.id}...`);
                await db.update(systemTemplate).set({ ...t, updatedAt: new Date() }).where(eq(systemTemplate.id, t.id));
            } else {
                console.log(`Inserting ${t.id}...`);
                await db.insert(systemTemplate).values(t);
            }
        }
        console.log('✅ Templates terminés.');
    } catch (e: any) {
        console.error('❌ Erreur seeding:', e.message);
    }
    process.exit(0);
}

seed();

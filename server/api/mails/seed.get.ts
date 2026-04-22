import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { mailbox, user } from '../../../drizzle/src/db/schema'
import { sub } from 'date-fns'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })
    try {
        // Get first user to associate mails
        const allUsers = await db.select().from(user).limit(1)
        if (allUsers.length === 0) {
            return { success: false, message: 'No users found to seed mails for.' }
        }
        const targetUser = allUsers[0]

        const seedData = [
            {
                id: crypto.randomUUID(),
                userId: targetUser.id,
                fromName: 'Alex Smith',
                fromEmail: 'alex.smith@example.com',
                subject: 'Urgent: Partenariat Stratégique Q2',
                body: 'Bonjour, nous devons finaliser les termes de notre partenariat avant la fin de la semaine.',
                date: new Date(),
                unread: true,
                important: true,
                starred: true
            },
            {
                id: crypto.randomUUID(),
                userId: targetUser.id,
                fromName: 'Jordan Brown',
                fromEmail: 'jordan.brown@example.com',
                subject: 'Mise à jour Project Phoenix',
                body: 'Le module d\'authentification est terminé à 100%. Revue de code demain ?',
                date: sub(new Date(), { minutes: 45 }),
                unread: true,
                important: true
            },
            {
                id: crypto.randomUUID(),
                userId: targetUser.id,
                fromName: 'Taylor Green',
                fromEmail: 'taylor.green@example.com',
                subject: 'Déjeuner d\'équipe vendredi',
                body: 'On se retrouve au restaurant "La Casa" à 12h30 ? Tout le monde est invité.',
                date: sub(new Date(), { hours: 2 }),
                unread: false,
                starred: true,
                archived: true
            },
            {
                id: crypto.randomUUID(),
                userId: targetUser.id,
                fromName: 'Morgan White',
                fromEmail: 'morgan.white@example.com',
                subject: 'Proposition de Projet Horizon',
                body: 'Veuillez trouver ci-joint le document complet pour la phase d\'initiation.',
                date: sub(new Date(), { days: 1 }),
                unread: false,
                trashed: true
            }
        ]

        await db.insert(mailbox).values(seedData)
        return { success: true, count: seedData.length }
    } catch (e: any) {
        console.error('Seeding error:', e)
        return { success: false, error: e.message }
    }
})

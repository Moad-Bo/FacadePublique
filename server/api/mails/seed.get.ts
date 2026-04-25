import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { mailbox, emailLog, emailQueue, user } from '../../../drizzle/src/db/schema'
import { eq, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    // Only allow for users with manage_mail permission
    // await requireUserSession(event, { permission: 'manage_mail' })

    try {
        // 1. Get target user
        const users = await db.select().from(user).limit(1)
        if (users.length === 0) {
            return { success: false, message: 'No users found to seed' }
        }
        const targetUser = users[0]

        // 2. CLEANING - Clear all mail-related data for testing in real conditions
        console.log('Cleaning mailbox, logs and queue...')
        await db.delete(mailbox)
        await db.delete(emailLog)
        await db.delete(emailQueue)

        const contexts = ['marketing', 'newsletter', 'changelog', 'contact', 'moderation', 'support', 'system']
        const subjects = [
             "Confirmation de commande #8821",
             "Invitation: Webinaire Techknè",
             "Votre compte a été mis à jour",
             "Alert: Tentative de connexion",
             "Nouvelle réponse sur le forum",
             "Newsletter: Les nouveautés d'Avril",
             "Rappel: Facture impayée",
             "Maintenance programmée ce week-end",
             "Bienvenue au support VIP",
             "Rapport hédomadaire de performance"
        ]

        const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
        
        // 3. SEED JOURNAUX (Incoming Mails) - 100 lines
        const incoming = []
        for (let i = 0; i < 100; i++) {
            incoming.push({
                id: crypto.randomUUID(),
                userId: targetUser.id,
                fromName: `Contact ${i}`,
                fromEmail: `user${i}@external.com`,
                subject: getRandom(subjects),
                body: "Contenu du message entrant pour test.",
                toAccount: getRandom(['contact', 'support', 'moderation', 'system']),
                category: 'inbox',
                unread: Math.random() > 0.3,
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            })
        }
        await db.insert(mailbox).values(incoming)

        // 4. SEED ARCHIVES (Archived Mails) - 100 lines
        const archived = []
        for (let i = 0; i < 100; i++) {
            archived.push({
                id: crypto.randomUUID(),
                userId: targetUser.id,
                fromName: `Archive Source ${i}`,
                fromEmail: `archived${i}@history.com`,
                subject: `[Archive] ${getRandom(subjects)}`,
                body: "Message archivé historiquement.",
                toAccount: getRandom(contexts),
                category: 'inbox',
                archived: true,
                date: new Date(Date.now() - (30 + Math.random() * 90) * 24 * 60 * 60 * 1000)
            })
        }
        await db.insert(mailbox).values(archived)

        // 5. SEED JOURNAUX (Outgoing Logs) - 100 lines
        const logs = []
        for (let i = 0; i < 100; i++) {
            logs.push({
                id: crypto.randomUUID(),
                recipient: `client${i}@techkne.fr`,
                fromAlias: getRandom(contexts),
                subject: getRandom(subjects),
                type: getRandom(['system', 'campaign', 'marketing']),
                status: Math.random() > 0.1 ? 'sent' : 'failed',
                sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                content: "Message transactionnel envoyé."
            })
        }
        await db.insert(emailLog).values(logs)

        // 6. SEED PROGRAMMATION (Queue) - 100 lines
        const queueItems = []
        for (let i = 0; i < 100; i++) {
            queueItems.push({
                id: crypto.randomUUID(),
                recipient: `scheduled${i}@future.com`,
                subject: `[Prévu] ${getRandom(subjects)}`,
                html: "<p>Contenu planifié</p>",
                type: getRandom(['system', 'campaign', 'manual']),
                fromContext: getRandom(contexts),
                status: 'pending',
                scheduledAt: new Date(Date.now() + Math.random() * 15 * 24 * 60 * 60 * 1000),
                createdAt: new Date()
            })
        }
        await db.insert(emailQueue).values(queueItems)

        return { 
            success: true, 
            message: 'Database cleaned and seeded with 400 entries for metric testing (Journal, Archive, Preview).',
            user: targetUser.email
        }
    } catch (e: any) {
        console.error('Seed execution error:', e)
        throw createError({ statusCode: 500, message: e.message })
    }
})

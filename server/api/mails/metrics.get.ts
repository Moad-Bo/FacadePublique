import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { emailLog, mailbox, audience } from '../../../drizzle/src/db/schema'
import { eq, sql, count, isNull, and } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })
    try {
        // 1. Received Mails Count
        const [receivedRes] = await db.select({ value: count() })
            .from(mailbox)
            .where(eq(mailbox.category, 'inbox'))
            .catch(() => [{ value: 0 }])

        // 2. Sent Mails Count
        const [sentRes] = await db.select({ value: count() })
            .from(emailLog)
            .where(eq(emailLog.status, 'sent'))
            .catch(() => [{ value: 0 }])

        // 3. Deliverability Calculation
        const [deliveredRes] = await db.select({ value: count() })
            .from(emailLog)
            .where(eq(emailLog.status, 'delivered'))
            .catch(() => [{ value: 0 }])

        const [failedRes] = await db.select({ value: count() })
            .from(emailLog)
            .where(eq(emailLog.status, 'failed'))
            .catch(() => [{ value: 0 }])

        const totalAttempted = (sentRes?.value || 0) + (deliveredRes?.value || 0) + (failedRes?.value || 0)
        const deliverabilityRate = totalAttempted > 0 
            ? Math.round(((deliveredRes?.value || 0) / totalAttempted) * 1000) / 10 
            : 100 // Default to 100% if no data

        // 4. Retention Calculation
        const [activeSubscribers] = await db.select({ value: count() })
            .from(audience)
            .where(and(eq(audience.optInNewsletter, true), isNull(audience.unsubscribedAt)))
            .catch(() => [{ value: 0 }])

        const [totalSubscribers] = await db.select({ value: count() })
            .from(audience)
            .catch(() => [{ value: 0 }])

        const retentionRate = totalSubscribers?.value > 0
            ? Math.round(((activeSubscribers?.value || 0) / totalSubscribers.value) * 1000) / 10
            : 0

        return {
            success: true,
            metrics: {
                received: receivedRes?.value || 0,
                sent: sentRes?.value || 0,
                deliverability: deliverabilityRate,
                retention: retentionRate
            }
        }
    } catch (e: any) {
        console.error('Inbox Metrics API Error:', e)
        throw createError({ statusCode: 500, message: 'Failed to fetch metrics' })
    }
})

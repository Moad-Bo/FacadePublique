import { db } from "../../utils/db";
import { emailLog, mailbox } from "../../../drizzle/src/db/schema";
import { gte, lte, and, eq } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    const query = getQuery(event);

    // Priority: explicit dateFrom/dateTo > period (days back) > default 30 days
    let startDate: Date;
    let endDate: Date;

    if (query.dateFrom) {
        startDate = new Date(query.dateFrom as string);
        startDate.setHours(0, 0, 0, 0);
    } else {
        const period = parseInt(query.period as string || '30');
        startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
    }

    if (query.dateTo) {
        endDate = new Date(query.dateTo as string);
        endDate.setHours(23, 59, 59, 999);
    } else {
        endDate = new Date();
    }

    const outgoing = await db.select()
        .from(emailLog)
        .where(and(
            gte(emailLog.sentAt, startDate),
            lte(emailLog.sentAt, endDate)
        ));

    const incoming = await db.select()
        .from(mailbox)
        .where(and(
            gte(mailbox.date, startDate),
            lte(mailbox.date, endDate),
            eq(mailbox.category, 'inbox')
        ));

    const unified = [
        ...outgoing.map(l => ({
            id: l.id,
            direction: 'outgoing',
            date: l.sentAt,
            from: l.fromAlias || l.type,
            to: l.recipient,
            subject: l.subject,
            context: l.type,
            status: l.status,
            error: l.errorMessage
        })),
        ...incoming.map(m => ({
            id: m.id,
            direction: 'incoming',
            date: m.date,
            from: m.fromEmail,
            to: m.toAccount || 'unknown',
            subject: m.subject,
            context: m.toAccount || 'inbox',
            status: 'delivered',
            error: null
        }))
    ];

    unified.sort((a, b) => {
        const da = a.date ? new Date(a.date as any).getTime() : 0;
        const db = b.date ? new Date(b.date as any).getTime() : 0;
        return db - da;
    });

    return {
        logs: unified,
        stats: {
            outgoing: outgoing.length,
            incoming: incoming.length
        }
    };
});

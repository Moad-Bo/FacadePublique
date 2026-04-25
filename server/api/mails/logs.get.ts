import { db } from "../../utils/db";
import { emailLog, mailbox } from "../../../drizzle/src/db/schema";
import { desc, sql, gt, and, eq } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    const query = getQuery(event);
    const period = parseInt(query.period as string || '30'); // Default to 30 days for better search

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - period);

    const outgoing = await db.select()
        .from(emailLog)
        .where(gt(emailLog.sentAt, dateLimit));

    const incoming = await db.select()
        .from(mailbox)
        .where(and(gt(mailbox.date, dateLimit), eq(mailbox.category, 'inbox')));

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
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
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

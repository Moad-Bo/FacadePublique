import { db } from "../../utils/db";
import { emailQueue } from "../../../drizzle/src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    const body = await readBody(event);
    const { action, ids } = body;

    if (!ids || !Array.isArray(ids)) {
        throw createError({ statusCode: 400, message: 'IDs are required' });
    }

    if (action === 'delete') {
        await db.delete(emailQueue).where(inArray(emailQueue.id, ids));
    } else if (action === 'retry') {
        await db.update(emailQueue)
            .set({ status: 'pending', retryCount: 0, updatedAt: new Date(), lockedAt: null })
            .where(inArray(emailQueue.id, ids));
    } else if (action === 'clear-all') {
        await db.delete(emailQueue);
    }

    return { success: true };
});

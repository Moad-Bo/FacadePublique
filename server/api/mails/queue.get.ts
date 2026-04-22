import { db } from "../../utils/db";
import { emailQueue } from "../../../drizzle/src/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    return await db.select()
        .from(emailQueue)
        .orderBy(desc(emailQueue.scheduledAt));
});

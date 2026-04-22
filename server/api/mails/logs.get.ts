import { db } from "../../utils/db";
import { emailLog } from "../../../drizzle/src/db/schema";
import { desc, sql, gt } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    const query = getQuery(event);
    const period = parseInt(query.period as string || '7'); // Default 7 days

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - period);

    return await db.select()
        .from(emailLog)
        .where(gt(emailLog.sentAt, dateLimit))
        .orderBy(desc(emailLog.sentAt));
});

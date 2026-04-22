import { db } from "../../../utils/db";
import { securityEvent as securityEventTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";
import { desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    await requireUserSession(event, { permission: 'manage_security' });

    console.log(`[ADMIN] Fetching security audit logs`);

    // 2. Query Logs
    const logs = await db.select()
        .from(securityEventTable)
        .orderBy(desc(securityEventTable.createdAt))
        .limit(100);

    return {
        logs: logs || []
    };
});

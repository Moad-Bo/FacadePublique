import { db } from "../../../utils/db";
import { ipBan as ipBanTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";
import { desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    await requireUserSession(event, { permission: 'manage_security' });

    console.log(`[ADMIN] Listing banned IPs`);

    // 2. Query Bans
    const bans = await db.select()
        .from(ipBanTable)
        .orderBy(desc(ipBanTable.createdAt));

    return {
        bans: bans || []
    };
});

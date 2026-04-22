import { db } from "../../../utils/db";
import { user as userTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";
import { eq, and, isNotNull } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    await requireUserSession(event, { permission: 'manage_security' });

    console.log(`[ADMIN] Fetching currently banned users`);

    // 2. Query Banned Users
    const bannedUsers = await db.select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        banned: userTable.banned,
        banReason: userTable.banReason,
        banAt: userTable.updatedAt, // Approximation of ban date if specifically not tracked
    })
    .from(userTable)
    .where(eq(userTable.banned, true));

    return {
        users: bannedUsers || []
    };
});

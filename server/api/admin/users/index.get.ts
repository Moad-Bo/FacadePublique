import { db } from "../../../utils/db";
import { user as userTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    await requireUserSession(event, { permission: 'manage_roles' });

    console.log(`[ADMIN] Listing users for ${event.path}`);

    // 2. Query Users
    const users = await db.select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        image: userTable.image,
        role: userTable.role,
        banned: userTable.banned,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt
    }).from(userTable);

    return {
        users: users || []
    };
});

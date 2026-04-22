import { auth } from "../../../lib/auth";
import { db } from "../../../utils/db";
import { user as userTable } from "../../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../../utils/auth";
import { validateBody } from "../../../utils/validation";
import { z } from "zod";

const banUserSchema = z.object({
    userId: z.string().min(1),
    reason: z.string().optional(),
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    const session = await requireUserSession(event, { permission: 'manage_roles' });
    const isCurrentAdmin = session.user.role === 'admin';

    // 2. Parse & Validate Body
    const { userId, reason } = await validateBody(event, banUserSchema);

    // 3. Security: Prevent non-admins from banning admins
    const targetResults = await db.select({ role: userTable.role })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

    const targetUser = targetResults[0];

    if (targetUser?.role === 'admin' && !isCurrentAdmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Seul un administrateur peut bannir un autre administrateur.",
        });
    }

    console.log(`[ADMIN] Banning user ${userId} by ${session.user.email}`);

    // 4. Perform Ban (Direct DB Bypass)
    try {
        await db.update(userTable)
            .set({ 
                banned: true, 
                banReason: reason || "Banni par un gestionnaire",
                updatedAt: new Date()
            })
            .where(eq(userTable.id, userId));

        return { success: true, message: "Utilisateur banni avec succès" };
    } catch (e: any) {
        console.error(`[ADMIN] User ban failed:`, e.message);
        throw createError({
            statusCode: 500,
            statusMessage: e.message || "Erreur lors du bannissement",
        });
    }
});

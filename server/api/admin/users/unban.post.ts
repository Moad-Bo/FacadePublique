import { auth } from "../../../lib/auth";
import { db } from "../../../utils/db";
import { user as userTable } from "../../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../../utils/auth";
import { validateBody } from "../../../utils/validation";
import { z } from "zod";

const unbanUserSchema = z.object({
    userId: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    const session = await requireUserSession(event, { permission: 'manage_roles' });

    // 2. Parse & Validate Body
    const { userId } = await validateBody(event, unbanUserSchema);

    console.log(`[ADMIN] Unbanning user ${userId} by ${session.user.email}`);

    // 4. Perform Unban (Direct DB Bypass)
    try {
        await db.update(userTable)
            .set({ 
                banned: false, 
                banReason: null,
                updatedAt: new Date()
            })
            .where(eq(userTable.id, userId));

        return { success: true, message: "Utilisateur débanni avec succès" };
    } catch (e: any) {
        console.error(`[ADMIN] User unban failed:`, e.message);
        throw createError({
            statusCode: 500,
            statusMessage: e.message || "Erreur lors du débannissement",
        });
    }
});

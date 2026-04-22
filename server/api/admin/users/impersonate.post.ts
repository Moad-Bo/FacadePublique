import { auth } from "../../../lib/auth";
import { db } from "../../../utils/db";
import { session as sessionTable, user as userTable } from "../../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../../utils/auth";
import { validateBody } from "../../../utils/validation";
import { z } from "zod";
import crypto from "node:crypto";

const impersonateUserSchema = z.object({
    userId: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    const session = await requireUserSession(event, { permission: 'manage_roles' });
    const isCurrentAdmin = session.user.role === 'admin';

    // 2. Parse & Validate Body
    const { userId } = await validateBody(event, impersonateUserSchema);

    // 3. Security: Prevent non-admins from impersonating admins
    const targetResults = await db.select({ role: userTable.role })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

    const targetUser = targetResults[0];

    if (targetUser?.role === 'admin' && !isCurrentAdmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Seul un administrateur peut imiter un autre administrateur.",
        });
    }

    console.log(`[ADMIN] User ${session.user.email} is impersonating ${userId}`);

    // 4. Perform Impersonation (Official Native Integration)
    // Now that we've defined 'testallperm' in Better Auth's AC system, 
    // we can use the official API which will generate a correct, stable session.
    try {
        const res = await auth.api.impersonateUser({
            body: { userId },
            asResponse: true,
            headers: getHeaders(event) // PASS HEADERS to authorize via AC
        });

        // Nitro's sendWebResponse is the correct way to proxy a Web Response object
        return sendWebResponse(event, res);
    } catch (e: any) {
        console.error(`[ADMIN] Impersonation failed:`, e.message);
        throw createError({
            statusCode: 500,
            statusMessage: e.message || "Erreur lors de l'imitation de l'utilisateur",
        });
    }
});

import { auth } from "../../../lib/auth";
import { db } from "../../../utils/db";
import { user as userTable, session as sessionTable, account as accountTable, mailbox as mailboxTable } from "../../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../../utils/auth";
import { validateBody } from "../../../utils/validation";
import { z } from "zod";

const deleteUserSchema = z.object({
    userId: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    const session = await requireUserSession(event, { permission: 'manage_roles' });
    const isCurrentAdmin = session.user.role === 'admin';

    // 2. Parse & Validate Body
    const { userId } = await validateBody(event, deleteUserSchema);

    // 3. Security Check & User Retrieval
    const userResults = await db.select({ 
            id: userTable.id, 
            name: userTable.name, 
            email: userTable.email, 
            role: userTable.role 
        })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

    const targetUser = userResults[0];

    if (!targetUser) {
        throw createError({ statusCode: 404, statusMessage: "Utilisateur non trouvé" });
    }

    if (targetUser.role === 'admin' && !isCurrentAdmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Seul un administrateur peut supprimer un compte administrateur.",
        });
    }

    console.log(`[ADMIN] Archiving data and deleting user ${userId} by ${session.user.email}`);

    // 4. Perform Archival & Deletion (Direct DB Bypass)
    try {
        await db.transaction(async (tx) => {
            // A. Dissociate and Archive Mailbox items (instead of deleting)
            await tx.update(mailboxTable)
                .set({ 
                    userId: null, 
                    archived: true, 
                    deletedUserRef: `${targetUser.name} (${targetUser.email})`
                })
                .where(eq(mailboxTable.userId, userId));

            // B. Delete strictly transient data (sessions/accounts)
            await tx.delete(sessionTable).where(eq(sessionTable.userId, userId));
            await tx.delete(accountTable).where(eq(accountTable.userId, userId));
            
            // C. Finally delete the user account
            await tx.delete(userTable).where(eq(userTable.id, userId));
        });

        return { success: true, message: "Utilisateur supprimé (Données de communication archivées)" };
    } catch (e: any) {
        console.error(`[ADMIN] User deletion failed:`, e.message);
        throw createError({
            statusCode: 500,
            statusMessage: e.message || "Erreur lors de la suppression de l'utilisateur",
        });
    }
});

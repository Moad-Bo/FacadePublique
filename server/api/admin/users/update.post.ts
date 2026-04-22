import { auth } from "../../../lib/auth";
import { db } from "../../../utils/db";
import { user as userTable, role as roleTable } from "../../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../../utils/auth";
import { ALL_PERMISSIONS } from "../../../../app/lib/permissions";

import { validateBody } from "../../../utils/validation";
import { z } from "zod";

const updateUserSchema = z.object({
    userId: z.string().min(1),
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.string().optional(),
    permissions: z.union([z.string(), z.array(z.string())]).optional()
});

export default defineEventHandler(async (event) => {
    // 1. Security Check
    const session = await requireUserSession(event, { permission: 'manage_roles' });
    const isCurrentAdmin = session.user.role === 'admin';

    // 2. Parse & Validate Body
    const { userId, name, email, password, role, permissions } = await validateBody(event, updateUserSchema);

    // Security: Only admins can assign the 'admin' role
    console.log(`[ADMIN-SECURITY] ${session.user.email} attempting to update user ${userId} with role: ${role}`);

    if (role === 'admin' && !isCurrentAdmin) {
        console.warn(`[ADMIN-SECURITY] BLOCKED: Non-admin ${session.user.email} attempted to assign ADMIN role to ${userId}.`);
        throw createError({
            statusCode: 403,
            statusMessage: "Seul un administrateur peut assigner le rôle 'admin'.",
        });
    }

    // Security: Only admins can assign roles that have 'manage_roles'
    if (role && role !== 'admin') {
         const roleData = await db.select({ permissions: roleTable.permissions })
            .from(roleTable)
            .where(eq(roleTable.name, role.toLowerCase()))
            .limit(1);
        
        const perms = roleData[0]?.permissions || "";
        if (perms.includes('manage_roles') && !isCurrentAdmin) {
            console.warn(`[ADMIN-SECURITY] BLOCKED: Non-admin ${session.user.email} attempted to grant role '${role}' (has manage_roles) to ${userId}.`);
            throw createError({
                statusCode: 403,
                statusMessage: "Seul un administrateur peut attribuer un rôle possédant la permission de gestion des rôles.",
            });
        }
    }

    console.log(`[ADMIN] Updating user ${userId}: role=${role}, name=${name}, email=${email}`);

    // 3. Perform Updates
    try {
        await db.transaction(async (tx) => {
            const updateData: any = {};
            
            if (name) updateData.name = name;
            if (email) updateData.email = email;
            if (role) updateData.role = role;

            // Update Custom Permissions
            if (typeof permissions === 'string' || Array.isArray(permissions)) {
                const permArray = Array.isArray(permissions) ? permissions : (permissions || "").split(',').filter(Boolean);
                const allowedValues = ALL_PERMISSIONS.map(p => p.value);
                const sanitizedArray = permArray
                    .map((p: string) => p.trim())
                    .filter((p: string) => allowedValues.includes(p as any));
                
                // ESCALATION CHECK: Only full admins can grant manage_roles
                if (sanitizedArray.includes('manage_roles') && !isCurrentAdmin) {
                    throw createError({
                        statusCode: 403,
                        statusMessage: "Seul un administrateur peut accorder la permission 'manage_roles'.",
                    });
                }

                updateData.permissions = sanitizedArray.join(',');
            }

            if (Object.keys(updateData).length > 0) {
                await tx.update(userTable)
                    .set(updateData)
                    .where(eq(userTable.id, userId));
            }
        });

        // 4. Update Password (via Better Auth Admin API)
        if (password) {
            console.log(`[ADMIN] Updating password for user ${userId}`);
            
            // Internal call to Better Auth admin endpoint
            const result = await auth.api.setUserPassword({
                body: {
                    userId,
                    newPassword: password
                },
                headers: getHeaders(event) // Pass session headers to authorize via admin AC
            }) as any;

            if (result && result.status === false) {
                console.error(`[ADMIN] Password update reported failure for ${userId}`);
                throw createError({
                    statusCode: 400,
                    statusMessage: "Le changement de mot de passe a été refusé par le système d'authentification.",
                });
            }
            
            console.log(`[ADMIN] Password updated successfully for ${userId}`);
        }

        return { success: true, message: "Utilisateur mis à jour avec succès" };
    } catch (error: any) {
        // Detailed error logging to avoid empty messages
        const errorData = error.data || error;
        console.error(`[ADMIN] Update failed for ${userId}:`, JSON.stringify(errorData, null, 2));
        
        throw createError({
            statusCode: 500,
            statusMessage: error.data?.message || error.message || "Erreur lors de la mise à jour de l'utilisateur",
        });
    }
});

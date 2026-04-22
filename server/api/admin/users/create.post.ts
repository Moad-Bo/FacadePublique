import { auth } from "../../../lib/auth";
import { db } from "../../../utils/db";
import { user as userTable, role as roleTable } from "../../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../../utils/auth";
import { validateBody } from "../../../utils/validation";
import { z } from "zod";

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.string().optional().default('user'),
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission-based)
    const session = await requireUserSession(event, { permission: 'manage_roles' });
    const isCurrentAdmin = session.user.role === 'admin';

    // 2. Parse & Validate Body
    const { email, password, name, role } = await validateBody(event, createUserSchema);

    // 3. Security Escalation Check
    console.log(`[ADMIN-SECURITY] ${session.user.email} (role: ${session.user.role}) attempting to create user with role: ${role}`);

    // If setting to admin role, only admin allowed
    if (role === 'admin' && !isCurrentAdmin) {
        console.warn(`[ADMIN-SECURITY] BLOCKED: Non-admin ${session.user.email} attempted to create an ADMIN user.`);
        throw createError({
            statusCode: 403,
            statusMessage: "Seul un administrateur peut créer un utilisateur avec le rôle 'admin'.",
        });
    }

    // If setting to a role that has 'manage_roles' permission, only admin allowed
    if (role && role !== 'admin') {
        const roleData = await db.select({ permissions: roleTable.permissions })
            .from(roleTable)
            .where(eq(roleTable.name, role.toLowerCase()))
            .limit(1);
        
        const perms = roleData[0]?.permissions || "";
        if (perms.includes('manage_roles') && !isCurrentAdmin) {
            console.warn(`[ADMIN-SECURITY] BLOCKED: Non-admin ${session.user.email} attempted to grant role '${role}' which has 'manage_roles' permission.`);
            throw createError({
                statusCode: 403,
                statusMessage: "Seul un administrateur peut attribuer un rôle possédant la permission de gestion des rôles.",
            });
        }
    }

    console.log(`[ADMIN] Creating user ${email} by ${session.user.email}`);

    // 4. Perform Creation (Direct Bypass Strategy)
    try {
        // A. Create the base user using standard signup (bypasses admin role check)
        const result = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            }
        });

        if (!result || !result.user) {
             throw new Error("Échec de la création du compte utilisateur");
        }

        // B. Force update the role and permissions via Drizzle
        await db.update(userTable)
            .set({ 
                role: role,
                // Optional: set initial permissions here if needed
                updatedAt: new Date()
            })
            .where(eq(userTable.id, result.user.id));

        return { success: true, message: "Utilisateur créé avec succès", user: result.user };
    } catch (e: any) {
        console.error(`[ADMIN] User creation failed:`, e.message);
        throw createError({
            statusCode: 500,
            statusMessage: e.message || "Erreur lors de la création de l'utilisateur",
        });
    }
});

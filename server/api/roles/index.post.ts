import { db } from "../../utils/db";
import { role, user as userTable } from "../../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";
import { randomUUID } from "crypto";
import { roles as codeRoles } from "../../../app/lib/permissions";
import { clearRoleCache } from "../../lib/auth";

import { validateBody } from "../../utils/validation";
import { z } from "zod";

const roleSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Le nom du rôle doit faire au moins 2 caractères"),
    permissions: z.union([z.string(), z.array(z.string())]).optional()
});

export default defineEventHandler(async (event) => {
    console.log(`[ROLES] POST request to ${event.path}`);
    
    // 1. Auth Check
    const session = await requireUserSession(event, { permission: "manage_roles" });
    const isFullAdmin = session.user.role === 'admin';
    
    // 2. Validate Body
    const { id, name, permissions } = await validateBody(event, roleSchema);
    console.log("[ROLES] Payload received:", { id, name, permissions });

    if (!name) {
        throw createError({
            statusCode: 400,
            statusMessage: "Le nom du rôle est obligatoire",
        });
    }

    // Security: Prevent modifying built-in code roles through this API
    if (codeRoles[name.toLowerCase()] && !id?.startsWith('db_')) {
        console.warn(`[ROLES] Attempt to modify built-in role: ${name}`);
        // Allow if we want to store overrides in DB, but otherwise block
        // For now, let's allow custom permissions for these names in DB if id is provided
    }

    // Security: only allow predefined permissions
    const allowed = [
        'docs:internal', 
        'manager:customers', 
        'manager:members', 
        'support:chat',
        'manage_mail',
        'manage_newsletter',
        'manage_membre',
        'manage_roles',
        'manage_mails' // Temporary legacy support
    ];
    const permArray = typeof permissions === 'string' ? permissions.split(',') : (permissions || []);
    const sanitizedArray = permArray.map((p: string) => p.trim()).filter((p: string) => allowed.includes(p));
    
    // ESCALATION CHECK: Only full admins can grant manage_roles
    if (sanitizedArray.includes('manage_roles') && !isFullAdmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Seul un administrateur peut accorder la permission 'manage_roles'.",
        });
    }

    const sanitized = sanitizedArray.join(',');

    // Update existing
    if (id && !id.startsWith('static_')) {
        console.log(`[ROLES] Updating existing role: ${id}`);
        
        await db.transaction(async (tx) => {
            // Find old name to update users
            const currentRole = await tx.select().from(role).where(eq(role.id, id)).limit(1);
            const oldName = currentRole[0]?.name;
            const normalizedName = name.toLowerCase();

            await tx.update(role)
                .set({ 
                    name: normalizedName, 
                    permissions: sanitized,
                    updatedAt: new Date() 
                })
                .where(eq(role.id, id));
            
            // If name changed, migrate users
            if (oldName && oldName !== normalizedName) {
                console.log(`[ROLES] Name changed from ${oldName} to ${normalizedName}. Migrating users...`);
                await tx.update(userTable)
                    .set({ role: normalizedName })
                    .where(eq(userTable.role, oldName));
            }
        });
            
        clearRoleCache(name);
        return { success: true, message: "Rôle mis à jour" };
    } 
    
    // Create new - Check uniqueness
    const existing = await db.select().from(role).where(eq(role.name, name)).limit(1);
    if (existing.length > 0) {
        console.warn(`[ROLES] Role already exists: ${name}`);
        throw createError({
            statusCode: 409,
            statusMessage: "Un rôle avec ce nom existe déjà en base de données",
        });
    }

    const newId = randomUUID();
    console.log(`[ROLES] Inserting new role: ${name} (ID: ${newId})`);
    
    try {
        await db.insert(role).values({
            id: newId,
            name: name.toLowerCase(), // Normalize role names
            permissions: sanitized,
            isStatic: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log("[ROLES] Success");
        clearRoleCache(name.toLowerCase());
        return { success: true, message: "Rôle créé", id: newId };
    } catch (e: any) {
        console.error("[ROLES] Database insert failed:", e.message);
        throw createError({
            statusCode: 500,
            statusMessage: "Échec de l'insertion en base de données",
        });
    }
});

import { db } from "../../utils/db";
import { role, user as userTable } from "../../../drizzle/src/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";
import { count } from "drizzle-orm";
import { clearRoleCache } from "../../lib/auth";

import { validateBody } from "../../utils/validation";
import { z } from "zod";

const deleteRoleSchema = z.object({
    id: z.string().min(1, "L'ID du rôle est obligatoire")
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check
    await requireUserSession(event, { permission: "manage_roles" });
  
    // 2. Validate Body
    const { id } = await validateBody(event, deleteRoleSchema);

  // 1. Get the role name
  const r = await db.select().from(role).where(eq(role.id, id)).limit(1);
  if (r.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Role not found" });
  }

  const roleName = r[0].name;

  // 2. Check if the role is static
  if (r[0].isStatic) {
    throw createError({ statusCode: 403, statusMessage: "Ce rôle système ne peut pas être supprimé." });
  }

  // 3. Check if role is in use
  const usage = await db.select({ value: count() })
    .from(userTable)
    .where(eq(userTable.role, roleName));

  const usageCount = Number(usage[0]?.value || 0);

  if (usageCount > 0) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: `Impossible de supprimer : ce rôle est actuellement utilisé par ${usageCount} utilisateur(s).` 
    });
  }

  // 4. Delete
  await db.delete(role).where(eq(role.id, id));
  clearRoleCache(roleName);

  return { success: true, message: "Rôle supprimé avec succès" };
});

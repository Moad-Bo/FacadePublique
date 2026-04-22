import { db } from "../../utils/db";
import { role as roleTable } from "../../../drizzle/src/db/schema";
import { requireUserSession } from "../../utils/auth";
import { roles as codeRoles } from "../../../app/lib/permissions";

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { permission: "manage_roles" });
  
  // 1. Fetch Dynamic Roles from DB
  const dbRoles = await db.select().from(roleTable).orderBy(roleTable.name);
  
  // 2. Map Static Roles from Code
  const staticRoles = Object.keys(codeRoles).map(name => ({
    id: `static_${name}`,
    name,
    permissions: "", // Permissions are managed in code for these
    isStatic: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  // 3. Merge: Database roles take precedence if names match
  const merged = [...dbRoles];
  const dbRoleNames = new Set(dbRoles.map(r => r.name.toLowerCase()));

  for (const sr of staticRoles) {
    if (!dbRoleNames.has(sr.name.toLowerCase())) {
      merged.push(sr as any);
    }
  }
  
  return merged.sort((a, b) => a.name.localeCompare(b.name));
});

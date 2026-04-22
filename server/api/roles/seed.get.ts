import { auth } from "../../lib/auth";
import { db } from "../../utils/db";
import { user } from "../../../drizzle/src/db/schema";
import { defineEventHandler } from "h3";
import { eq } from "drizzle-orm";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_roles' });
  const roles = ["user", "admin", "editor", "moderator"];
  const results = [];

  for (const r of roles) {
    const role = r as any; 
    const email = `${role}@example.com`;
    const name = role.charAt(0).toUpperCase() + role.slice(1);
    
    try {
      // Delete if exists to ensure password is correct
      await db.delete(user).where(eq(user.email, email));
      
      const res = await auth.api.createUser({
        body: {
          email,
          password: "password123",
          name,
          role
        }
      });
      results.push({ email, status: "re-created", role, res });
    } catch (e: any) {
      results.push({ email, status: "failed", error: e.message, role });
    }
  }

  return {
    message: "Seeding with reset completed",
    results
  };
});

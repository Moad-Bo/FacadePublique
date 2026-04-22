import { db } from "../../../utils/db";
import { settings as settingsTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission)
    await requireUserSession(event, { permission: 'manage_security' });

    // 2. Fetch Security Settings
    const settings = await db.select()
        .from(settingsTable);
    
    const securitySettings = {
        maxAttempts: settings.find(s => s.key === 'security_max_attempts')?.value || '5',
        warningThreshold: settings.find(s => s.key === 'security_warning_threshold')?.value || '3',
    };

    return {
        settings: securitySettings
    };
});

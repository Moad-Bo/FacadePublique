import { db } from "../../../utils/db";
import { settings as settingsTable, securityEvent as securityEventTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateBody } from "../../../utils/validation";

const securitySettingsSchema = z.object({
    maxAttempts: z.string().min(1),
    warningThreshold: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission)
    const session = await requireUserSession(event, { permission: 'manage_security' });

    // 2. Validate Body
    const { maxAttempts, warningThreshold } = await validateBody(event, securitySettingsSchema);

    if (parseInt(maxAttempts) <= parseInt(warningThreshold)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Le maximum de tentatives doit être supérieur au seuil d'alerte."
        });
    }

    console.log(`[ADMIN] Updating security settings: Max ${maxAttempts}, Warn ${warningThreshold} by ${session.user.email}`);

    // 3. Update Settings (Manual onDuplicate key since Drizzle mysql might be specific)
    const upsert = async (key: string, value: string) => {
        await db.insert(settingsTable).values({ key, value }).onDuplicateKeyUpdate({ set: { value } } as any);
    };

    await upsert('security_max_attempts', maxAttempts);
    await upsert('security_warning_threshold', warningThreshold);

    await db.insert(securityEventTable).values({
        id: crypto.randomUUID(),
        type: 'SETTINGS_UPDATE',
        ipAddress: 'System',
        details: `Security thresholds updated by ${session.user.email}: Max=${maxAttempts}, Warn=${warningThreshold}`,
    });

    return {
        success: true,
        message: "Réglages de sécurité mis à jour"
    };
});

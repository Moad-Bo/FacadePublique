import { db } from "../../../utils/db";
import { ipBan as ipBanTable, securityEvent as securityEventTable } from "../../../../drizzle/src/db/schema";
import { requireUserSession } from "../../../utils/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validateBody } from "../../../utils/validation";

const toggleBanSchema = z.object({
    ipAddress: z.string().min(1),
    action: z.enum(['ban', 'unban']),
    reason: z.string().optional()
});

export default defineEventHandler(async (event) => {
    // 1. Auth Check (Permission)
    const session = await requireUserSession(event, { permission: 'manage_security' });

    // 2. Validate Body
    const { ipAddress, action, reason } = await validateBody(event, toggleBanSchema);

    console.log(`[ADMIN] ${action}ning IP ${ipAddress} by ${session.user.email}`);

    if (action === 'ban') {
        await db.insert(ipBanTable).values({
            ipAddress,
            reason: reason || `Manual ban by ${session.user.email}`,
        }).onDuplicateKeyUpdate({ set: { reason: reason || `Updated manual ban` } } as any);
        
        await db.insert(securityEventTable).values({
            id: crypto.randomUUID(),
            type: 'BAN_TRIGGER',
            ipAddress,
            details: `Manual ban by ${session.user.email} (Reason: ${reason || 'None'})`,
        });
    } else {
        await db.delete(ipBanTable).where(eq(ipBanTable.ipAddress, ipAddress));
        
        await db.insert(securityEventTable).values({
            id: crypto.randomUUID(),
            type: 'UNBAN',
            ipAddress,
            details: `Manual unban by ${session.user.email}`,
        });
    }

    return {
        success: true,
        message: `IP ${ipAddress} ${action === 'ban' ? 'bannie' : 'débannie'} avec succès`
    };
});

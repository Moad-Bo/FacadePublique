import { defineEventHandler, getQuery, setHeader } from 'h3';
import { db } from '../../utils/db';
import { emailLog, campaign } from '../../../drizzle/src/db/schema';
import { eq, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const id = query.id as string;   // emailLog.id
    const cid = query.cid as string; // campaign.id (optional)

    if (id) {
        try {
            // 1. Update individual email log
            await db.update(emailLog)
                .set({ 
                    openCount: sql`${emailLog.openCount} + 1`,
                    openedAt: new Date()
                })
                .where(eq(emailLog.id, id));

            // 2. Update campaign metrics if applicable
            if (cid) {
                await db.update(campaign)
                    .set({ 
                        openedCount: sql`${campaign.openedCount} + 1` 
                    })
                    .where(eq(campaign.id, cid));
            }
        } catch (e) {
            console.error('[Tracking] Failed to log open:', e);
        }
    }

    // 3. Return 1x1 transparent GIF pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    setHeader(event, 'Content-Type', 'image/gif');
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');
    setHeader(event, 'Pragma', 'no-cache');
    setHeader(event, 'Expires', '0');
    
    return pixel;
});

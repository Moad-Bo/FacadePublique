import { defineEventHandler } from 'h3';
import { db } from '../../utils/db';
import { systemTemplate } from '../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    
    // In .get.ts, we only handle GET
    const templates = await db.select().from(systemTemplate);
    return { success: true, templates };
});

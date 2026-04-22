import { defineEventHandler } from 'h3';
import { db } from '../../utils/db';
import { emailLayout } from '../../../drizzle/src/db/schema';
import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    
    const layouts = await db.select().from(emailLayout);
    return { success: true, layouts };
});

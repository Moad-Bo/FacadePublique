import { defineEventHandler, createError } from 'h3';
import { db } from '../../utils/db';
import { systemTemplate } from '../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { requireUserSession } from '../../utils/auth';
import { validateBody } from '../../utils/validation';
import { z } from 'zod';

const systemTemplateSchema = z.object({
    id: z.string().min(1),
    subject: z.string().min(1),
    content: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' });
    
    try {
        const { id, subject, content } = await validateBody(event, systemTemplateSchema);

        await db.update(systemTemplate)
            .set({ subject, content })
            .where(eq(systemTemplate.id, id));

        return { success: true };
    } catch (e: any) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: e.message || 'Erreur lors de la mise à jour du template système' 
        });
    }
});

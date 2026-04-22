import { db } from '../../utils/db';
import { user as userTable, termsAgreement, audience } from '../../../drizzle/src/db/schema';
import { requireUserSession } from '../../utils/auth';
import { audienceService } from '../../services/audience.service';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const acceptTermsSchema = z.object({
  version: z.string().default('v1'),
  newsletterOptIn: z.boolean().default(false)
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userEmail = session.user.email;
  const userName = session.user.name;

  const body = await readBody(event);
  const validated = acceptTermsSchema.parse(body || {});

  try {
    // 1. Record the agreement in the dedicated table
    await db.insert(termsAgreement).values({
      id: crypto.randomUUID(),
      userId,
      version: validated.version,
      acceptedAt: new Date()
    });

    // 2. Grant the 'membre' role (provides community-access permission)
    await db.update(userTable)
      .set({ role: 'membre' })
      .where(eq(userTable.id, userId));

    // 3. Optional: Newsletter opt-in
    if (validated.newsletterOptIn) {
      await audienceService.upsertFromGuest(userEmail, 'community-onboarding', { newsletter: true });
    }



    return {
      success: true,
      message: 'You are now a member of the Techknè community.'
    };
  } catch (error) {
    console.error('[API][COMMUNITY] Failed to accept terms:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});

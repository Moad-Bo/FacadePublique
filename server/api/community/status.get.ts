import { db } from '../../utils/db';
import { termsAgreement } from '../../../drizzle/src/db/schema';
import { requireUserSession } from '../../utils/auth';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event).catch(() => null);
  
  if (!session) {
    return { isMember: false };
  }

  const userId = session.user.id;

  try {
    const agreement = await db.select()
      .from(termsAgreement)
      .where(and(eq(termsAgreement.userId, userId), eq(termsAgreement.version, 'v1')))
      .limit(1);


    return {
      isMember: agreement.length > 0
    };
  } catch (error) {
    console.error('[API][COMMUNITY] Status check failed:', error);
    return { isMember: false };
  }
});

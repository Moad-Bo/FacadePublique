import { defineEventHandler } from 'h3';
import { requireUserSession } from '../../utils/auth';
import { db } from '../../utils/db';
import { audience } from '../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const [prefs] = await db.select().from(audience).where(eq(audience.userId, userId));

  if (!prefs) {
    // Default values if no preferences yet
    return {
      optInNewsletter: false,
      optInMarketing: false,
      optInForum: true,
      optInChangelog: true,
      optInMentions: true,
      optInReplies: true
    };
  }

  return prefs;
});

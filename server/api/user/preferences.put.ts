import { defineEventHandler, readBody } from 'h3';
import { requireUserSession } from '../../utils/auth';
import { audienceService } from '../../services/audience.service';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const body = await readBody(event);

  await audienceService.updateForUser(userId, {
    newsletter: body.newsletter,
    marketing: body.marketing,
    changelog: body.changelog,
    mentions: body.mentions,
    replies: body.replies
  });

  return { success: true };
});

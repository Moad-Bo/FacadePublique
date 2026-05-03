import { db } from '../utils/db';
import { audience, user as userTable } from '../../drizzle/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const audienceService = {
  /**
   * Upsert d'un visiteur ou prospect (depuis le blog ou formulaire de contact)
   */
  async upsertFromGuest(email: string, source: string, optIns: { 
    newsletter?: boolean; 
    marketing?: boolean; 
    forum?: boolean;
    changelog?: boolean;
    mentions?: boolean;
    mentionsEmail?: boolean;
    replies?: boolean;
  } = {}) {
    try {
      const existing = await db.query.audience.findFirst({
        where: eq(audience.email, email.toLowerCase())
      });

      if (existing) {
        await db.update(audience)
          .set({
            optInNewsletter: optIns.newsletter ?? existing.optInNewsletter,
            optInMarketing: optIns.marketing ?? existing.optInMarketing,
            optInForum: optIns.forum ?? existing.optInForum,
            optInChangelog: optIns.changelog ?? existing.optInChangelog,
            optInMentions: optIns.mentions ?? existing.optInMentions,
            optInMentionMail: optIns.mentionsEmail ?? existing.optInMentionMail,
            optInReplies: optIns.replies ?? existing.optInReplies,
            source: source || existing.source,
            updatedAt: new Date()
          })
          .where(eq(audience.email, email.toLowerCase()));
        return existing.id;
      }

      const id = uuidv4();
      await db.insert(audience).values({
        id,
        email: email.toLowerCase(),
        source,
        optInNewsletter: optIns.newsletter ?? false,
        optInMarketing: optIns.marketing ?? false,
        optInForum: optIns.forum ?? true,
        optInChangelog: optIns.changelog ?? true,
        optInMentions: optIns.mentions ?? true,
        optInMentionMail: optIns.mentionsEmail ?? true,
        optInReplies: optIns.replies ?? true,
      });
      return id;
    } catch (error) {
      console.error('[AUDIENCE_SERVICE] Error in upsertFromGuest:', error);
      throw error;
    }
  },

  /**
   * Synchronisation post-inscription Better Auth
   */
  async syncFromAuth(user: { id: string; email: string }, optInMarketing: boolean = false) {
    try {
      const existing = await db.query.audience.findFirst({
        where: eq(audience.email, user.email.toLowerCase())
      });

      if (existing) {
        await db.update(audience)
          .set({
            userId: user.id,
            optInMarketing: optInMarketing || existing.optInMarketing,
            updatedAt: new Date()
          })
          .where(eq(audience.email, user.email.toLowerCase()));
        return existing.id;
      }

      const id = uuidv4();
      await db.insert(audience).values({
        id,
        email: user.email.toLowerCase(),
        userId: user.id,
        source: 'signup',
        optInNewsletter: true, // Par défaut à l'inscription
        optInMarketing,
        optInForum: true,
      });
      return id;
    } catch (error) {
      console.error('[AUDIENCE_SERVICE] Error in syncFromAuth:', error);
      throw error;
    }
  },

  /**
   * Mise à jour des préférences pour un utilisateur authentifié
   */
  async updateForUser(userId: string, optIns: { 
    newsletter?: boolean; 
    marketing?: boolean; 
    forum?: boolean;
    changelog?: boolean;
    mentions?: boolean;
    mentionsEmail?: boolean;
    replies?: boolean;
  }) {
    try {
      const existing = await db.query.audience.findFirst({
        where: eq(audience.userId, userId)
      });

      if (!existing) {
        // Find by email first to avoid duplicates if they were a guest before
        const user = await db.query.user.findFirst({ where: eq(userTable.id, userId) });
        if (!user) throw new Error('User not found');
        
        return await this.upsertFromGuest(user.email, 'settings', optIns);
      }

      await db.update(audience)
        .set({
          optInNewsletter: optIns.newsletter ?? existing.optInNewsletter,
          optInMarketing: optIns.marketing ?? existing.optInMarketing,
          optInForum: optIns.forum ?? existing.optInForum,
          optInChangelog: optIns.changelog ?? existing.optInChangelog,
          optInMentions: optIns.mentions ?? existing.optInMentions,
          optInMentionMail: optIns.mentionsEmail ?? existing.optInMentionMail,
          optInReplies: optIns.replies ?? existing.optInReplies,
          updatedAt: new Date()
        })
        .where(eq(audience.userId, userId));
    } catch (error) {
      console.error('[AUDIENCE_SERVICE] Error in updateForUser:', error);
      throw error;
    }
  }
};

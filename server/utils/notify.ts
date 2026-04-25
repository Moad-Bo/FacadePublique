import { db } from './db';
import { notification, audience, user as userTable } from '../../drizzle/src/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { sendEmail } from './email';
import { randomUUID } from 'crypto';

export type NotifyType = 'mention' | 'reply' | 'newsletter' | 'marketing' | 'changelog' | 'system' | 'security' | 'moderation_alert' | 'ticket_resolved' | 'new_mail';

interface NotifyOptions {
  userId?: string;
  targetRole?: string;
  permission?: string;
  type: NotifyType;
  title: string;
  body: string;
  actionUrl?: string;
  emailSubject?: string;
  emailHtml?: string;
  sourceAuthor?: { name: string, email: string };
}

/**
 * Agnostic Notification Dispatcher
 */
export const notify = {
  /**
   * Envoi d'une notification avec check des préférences
   */
  async send(options: NotifyOptions) {
    const { userId, targetRole, type, title, body, actionUrl, emailSubject, emailHtml, sourceAuthor } = options;

    let targetUserIds: string[] = [];
    
    if (userId) {
      targetUserIds = [userId];
    } else if (targetRole) {
      const usersWithRole = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.role, targetRole));
      targetUserIds = usersWithRole.map(u => u.id);
    } else if (options.permission) {
      // Pour l'instant, on fallback sur admin s'il s'agit de permissions sensibles
      const admins = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.role, 'admin'));
      targetUserIds = admins.map(u => u.id);
    }

    if (targetUserIds.length === 0) return;

    for (const id of targetUserIds) {
      await processTargetNotification(id, options);
    }
  },

  /**
   * Compatibilité avec l'ancien système : focus sur un seul utilisateur
   */
  async user(userId: string, options: { 
    type: NotifyType | 'community_reply', 
    title: string, 
    body: string, 
    actionUrl?: string 
  }) {
    // Normalize community_reply to reply for preference check
    const type = options.type === 'community_reply' ? 'reply' : options.type as NotifyType;
    
    return this.send({
      userId,
      type,
      title: options.title,
      body: options.body,
      actionUrl: options.actionUrl
    });
  },

  /**
   * Dispatcher par permission (Legacy support)
   */
  async permission(perm: string, options: { 
    type?: NotifyType | 'community_reply', 
    title: string, 
    body: string, 
    actionUrl?: string 
  }) {
    return this.send({
      permission: perm,
      type: (options.type === 'community_reply' ? 'reply' : options.type) || 'system' as NotifyType,
      title: options.title,
      body: options.body,
      actionUrl: options.actionUrl
    });
  }
};

async function processTargetNotification(userId: string, options: NotifyOptions) {
  const { type, title, body, actionUrl, emailSubject, emailHtml, sourceAuthor } = options;

  // 1. Fetch User and their Audience Preferences
  const [targetUser] = await db.select().from(userTable).where(eq(userTable.id, userId));
  if (!targetUser) return;

  const [prefs] = await db.select().from(audience).where(eq(audience.userId, userId));

  // Determine Opt-ins (Defaults applied if no prefs found)
  const canSendInApp = true; // Most In-App are always allowed or have a general toggle
  let canSendEmail = false;

  // Mapping granular types to audience fields
  if (prefs) {
    if (type === 'newsletter') canSendEmail = prefs.optInNewsletter || false;
    else if (type === 'marketing') canSendEmail = prefs.optInMarketing || false;
    else if (type === 'mention') canSendEmail = prefs.optInMentions ?? true;
    else if (type === 'changelog') canSendEmail = prefs.optInChangelog ?? true;
    else if (type === 'reply') canSendEmail = prefs.optInReplies ?? true;
    else if (type === 'system' || type === 'security') canSendEmail = true; // Always send security/system
  } else {
    // Default fallback if no audience record (e.g. fresh user)
    canSendEmail = ['system', 'security', 'mention', 'reply', 'changelog'].includes(type);
  }

  // 2. Dispatch Intra-App Notification (Always if not blocked by a global push toggle)
  const pushAllowed = (type === 'mention') ? (prefs?.optInMentions ?? true) : true;
  const replyAllowed = (type === 'reply') ? (prefs?.optInReplies ?? true) : true;

  if (pushAllowed && replyAllowed) {
    try {
      await db.insert(notification).values({
        id: randomUUID(),
        userId: userId,
        type: type as string,
        title: title,
        body: body,
        actionUrl: actionUrl,
        isRead: false,
        createdAt: new Date()
      });
    } catch (e) {
      console.warn(`[NOTIFY] Failed to insert DB notification for ${userId}`, e);
    }
  }

  // 3. Dispatch Email Alert
  if (canSendEmail && (emailSubject || emailHtml)) {
    await sendEmail({
      recipient: targetUser.email,
      subject: emailSubject || title,
      type: (type === 'newsletter' || type === 'marketing') ? type : 'notification',
      html: emailHtml || `<p>${body}</p><br/><a href="${actionUrl}">Voir plus</a>`,
      fromContext: sourceAuthor?.name || 'Système'
    });
  }
}

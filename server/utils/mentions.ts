import { notify } from './notify';

/**
 * Parses HTML content to find Tiptap mentions and trigger notifications.
 */
export async function processMentions(content: string, source: { authorName: string, authorEmail: string, contextUrl?: string }) {
  // Regex to find: <span data-type="mention" data-id="ID_HERE">
  const mentionRegex = /<span[^>]*data-type="mention"[^>]*data-id="([^"]*)"[^>]*>/g;
  let match;
  const mentions = new Set<string>();

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.add(match[1]);
  }

  if (mentions.size === 0) return;

  for (const targetId of mentions) {
    await triggerMentionNotification(targetId, content, source);
  }
}

async function triggerMentionNotification(targetId: string, fullContent: string, source: { authorName: string, authorEmail: string, contextUrl?: string }) {
  console.log(`[Mentions] Triggering agnostic notification logic for ${targetId}`);

  let targetRole: string | undefined = undefined;
  let userId: string | undefined = undefined;
  let label = targetId;

  if (targetId === 'role:admin') {
    targetRole = 'admin';
    label = 'Administration';
  } else if (targetId === 'role:support') {
    targetRole = 'support';
    label = 'Support Client';
  } else if (targetId === 'role:all') {
    // Massive notification handling usually omitted or specialized
    return;
  } else if (targetId.startsWith('var:')) {
    // System variables are not mentions for notifications
    return;
  } else if (targetId.startsWith('USER_')) {
    userId = targetId.split('_')[1];
  } else {
    return;
  }

  const mentionContentClean = fullContent.replace(/<[^>]*>/g, '');
  const mentionCardHtml = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0;">
      <p style="font-size: 14px; color: #64748b; margin-top: 0;">On vous a mentionné, voici ce qui se dit :</p>
      <div style="font-style: italic; color: #1e293b; border-left: 4px solid #6366f1; padding-left: 16px; margin: 16px 0;">
        ${mentionContentClean.length > 300 ? mentionContentClean.substring(0, 300) + '...' : mentionContentClean}
      </div>
      <p style="margin-bottom: 0;">
        <a href="${source.contextUrl || '#'}" style="color: #6366f1; font-weight: bold; text-decoration: none;">Voir la discussion complète &rarr;</a>
      </p>
    </div>
  `;

  await notify.send({
    userId,
    targetRole,
    type: 'mention',
    title: 'Nouvelle mention',
    body: `${source.authorName} vous a mentionné dans un message.`,
    actionUrl: source.contextUrl,
    emailSubject: `[Mention] ${source.authorName} vous a cité`,
    emailHtml: `
      <h2>Bonjour ${label},</h2>
      <p><strong>${source.authorName}</strong> (${source.authorEmail}) a attiré votre attention.</p>
      ${mentionCardHtml}
      <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
      <p style="font-size: 11px; color: #a0aec0;">Ce message a été généré automatiquement par le système de mentions Techknè.</p>
    `,
    sourceAuthor: { name: source.authorName, email: source.authorEmail }
  });
}

/**
 * server/api/notifications/stream.get.ts
 *
 * 📡 SSE Endpoint — /api/notifications/stream
 *
 * Ouvre un canal Server-Sent Events pour l'utilisateur authentifié.
 * - Enregistre la connexion dans le SSE Manager
 * - Envoie un heartbeat toutes les 25s pour maintenir la connexion ouverte
 * - Nettoie automatiquement à la fermeture de l'onglet
 *
 * Côté client :
 *   const es = new EventSource('/api/notifications/stream')
 *   es.onmessage = (e) => { const payload = JSON.parse(e.data); ... }
 */

import { defineEventHandler, createEventStream, setResponseHeader } from 'h3';
import { requireUserSession } from '../../utils/auth';
import { useSSEManager } from '../../plugins/sse-manager';

export default defineEventHandler(async (event) => {
  // 1. Authentification obligatoire — pas de SSE anonyme
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const userRoles = [session.user.role].filter(Boolean) as string[];

  // 2. Créer le stream SSE H3
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');
  setResponseHeader(event, 'X-Accel-Buffering', 'no'); // Désactive le buffering proxy (Nginx/Ngrok)

  const eventStream = createEventStream(event);

  // 3. Enregistrer dans le SSE Manager
  const sseManager = useSSEManager();
  const cleanup = sseManager.register({
    userId,
    roles: userRoles,
    write: (payload) => {
      // H3 createEventStream.push() envoie un event SSE formaté
      eventStream.push(JSON.stringify(payload)).catch(() => cleanup());
    },
    close: () => eventStream.close(),
  });

  // 4. Heartbeat (ping) toutes les 25s pour éviter les déconnexions réseau
  const heartbeat = setInterval(() => {
    eventStream.push(JSON.stringify({ type: 'ping' })).catch(() => {
      clearInterval(heartbeat);
      cleanup();
    });
  }, 25_000);

  // 5. Nettoyage garanti à la fermeture
  eventStream.onClosed(async () => {
    clearInterval(heartbeat);
    cleanup();
  });

  // 6. Message de bienvenue immédiat (confirme la connexion au client)
  await eventStream.push(JSON.stringify({
    type: 'connected',
    title: 'Notifications activées',
  }));

  // 7. Envoyer les dernières notifications non lues pour assurer la synchronisation
  try {
    const { db } = await import('../../utils/db');
    const { notification } = await import('../../../drizzle/src/db/schema');
    const { eq, and, desc } = await import('drizzle-orm');

    const unread = await db.select()
      .from(notification)
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)))
      .orderBy(desc(notification.createdAt))
      .limit(5);

    for (const notif of unread) {
      await eventStream.push(JSON.stringify({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        actionUrl: notif.actionUrl,
        isHistory: true, // Tag pour éviter les doublons UI si déjà chargées via API
      }));
    }
  } catch (e) {
    console.warn('[SSE] Impossible d\'envoyer le spool initial:', e);
  }

  return eventStream.send();
});

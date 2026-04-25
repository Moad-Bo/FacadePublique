/**
 * server/plugins/sse-manager.ts
 *
 * 🔌 SSE Manager — Watchdog In-App
 *
 * Gère la Map des connexions SSE actives en RAM.
 * Chaque utilisateur connecté est enregistré par { userId → Set<WritableStream> }
 * (Un utilisateur peut avoir plusieurs onglets ouverts).
 *
 * Règle critique : Nettoyage systématique au stream.onClosed pour éviter les fuites mémoire.
 *
 * Accessible depuis n'importe quel handler via : useSSEManager()
 */

import type { H3Event } from 'h3';

export interface SSEClient {
  userId: string;
  roles: string[];         // Rôles de l'utilisateur pour le ciblage par rôle
  write: (event: SSEPayload) => void;
  close: () => void;
}

export interface SSEPayload {
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  id?: string;            // notification.id pour marquer comme lu
}

// ─── Map globale des connexions ────────────────────────────────────────────────
// userId → Map<connectionId, SSEClient>
// Plusieurs onglets = plusieurs entries pour le même userId
const connections = new Map<string, Map<string, SSEClient>>();

let connIdCounter = 0;

// ─── API publique du manager ───────────────────────────────────────────────────

export const sseManager = {
  /**
   * Enregistre un nouveau client SSE.
   * @returns Un callback de nettoyage à appeler lors de la fermeture du stream.
   */
  register(client: SSEClient): () => void {
    const connId = String(++connIdCounter);
    
    if (!connections.has(client.userId)) {
      connections.set(client.userId, new Map());
    }
    connections.get(client.userId)!.set(connId, client);

    console.info(`[SSE] Client connecté: userId=${client.userId} connId=${connId} | Total: ${sseManager.totalConnections()}`);

    // Retourne le callback de nettoyage
    return () => {
      const userConns = connections.get(client.userId);
      if (userConns) {
        userConns.delete(connId);
        if (userConns.size === 0) {
          connections.delete(client.userId);
        }
      }
      console.info(`[SSE] Client déconnecté: userId=${client.userId} connId=${connId} | Total: ${sseManager.totalConnections()}`);
    };
  },

  /**
   * Envoie un event SSE à un utilisateur spécifique (tous ses onglets).
   */
  sendToUser(userId: string, payload: SSEPayload): void {
    const userConns = connections.get(userId);
    if (!userConns || userConns.size === 0) return;

    for (const client of userConns.values()) {
      try {
        client.write(payload);
      } catch (e) {
        console.warn(`[SSE] Échec d'écriture pour userId=${userId}:`, e);
      }
    }
  },

  /**
   * Broadcast un event SSE à tous les clients ayant un rôle donné.
   * Ex : broadcast vers tous les 'support' ou 'moderator' connectés.
   */
  broadcastToRole(role: string, payload: SSEPayload): void {
    let count = 0;
    for (const [userId, userConns] of connections.entries()) {
      for (const client of userConns.values()) {
        if (client.roles.includes(role)) {
          try {
            client.write(payload);
            count++;
          } catch (e) {
            console.warn(`[SSE] Échec broadcast role=${role} pour userId=${userId}:`, e);
          }
        }
      }
    }
    if (count > 0) {
      console.info(`[SSE] Broadcast role=${role}: ${count} client(s) notifié(s)`);
    }
  },

  /**
   * Nombre total de connexions actives (toutes tabs confondues).
   */
  totalConnections(): number {
    let n = 0;
    for (const m of connections.values()) n += m.size;
    return n;
  },
};

// ─── Plugin Nuxt/Nitro ────────────────────────────────────────────────────────

export default defineNitroPlugin((nitroApp) => {
  // Expose le manager sur nitroApp pour accès depuis les handlers
  (nitroApp as any).sseManager = sseManager;
  console.info('[SSE] SSE Manager initialisé');
});

// ─── Composable serveur ────────────────────────────────────────────────────────

/**
 * Retourne l'instance du SSE Manager depuis n'importe quel event handler.
 */
export function useSSEManager() {
  return sseManager;
}

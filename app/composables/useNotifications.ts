/**
 * app/composables/useNotifications.ts
 *
 * 🔔 Composable Notifications In-App (SSE + Store)
 *
 * Connecte le front au stream SSE /api/notifications/stream et
 * gère l'état global des notifications dans le store Nuxt (useState).
 *
 * Usage dans le layout dashboard :
 *   const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications()
 */

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  // ── Store partagé entre tous les composants ───────────────────────────────
  const notifications = useState<AppNotification[]>('app-notifications', () => []);
  const isConnected = useState<boolean>('notifications-connected', () => false);
  const isLoading = ref(false);
  const eventSource = useState<EventSource | null>('sse-eventsource', () => null);

  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length);

  // ── Chargement initial (hydratation depuis BDD) ───────────────────────────
  const loadNotifications = async () => {
    isLoading.value = true;
    try {
      const data = await $fetch<{ items: AppNotification[]; unreadCount: number }>('/api/notifications');
      notifications.value = data.items;
    } catch (e) {
      console.warn('[Notifications] Impossible de charger les notifications:', e);
    } finally {
      isLoading.value = false;
    }
  };

  // ── Connexion SSE ─────────────────────────────────────────────────────────
  const connect = () => {
    if (!import.meta.client) return; // SSR guard
    if (eventSource.value) return;   // Déjà connecté

    const es = new EventSource('/api/notifications/stream');
    eventSource.value = es;

    es.onopen = () => {
      isConnected.value = true;
      console.info('[SSE] Connexion établie');
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          id?: string;
          type: string;
          title: string;
          body?: string;
          actionUrl?: string;
        };

        // Ignorer les pings heartbeat et les messages de connexion
        if (payload.type === 'ping' || payload.type === 'connected') return;

        // Préfixer en tête de liste
        notifications.value.unshift({
          id: payload.id || crypto.randomUUID(),
          type: payload.type,
          title: payload.title,
          body: payload.body,
          actionUrl: payload.actionUrl,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[SSE] Message non parsable:', event.data);
      }
    };

    es.onerror = () => {
      isConnected.value = false;
      console.warn('[SSE] Connexion perdue, tentative de reconnexion in 5s...');
      es.close();
      eventSource.value = null;
      // Reconnexion automatique après 5s
      setTimeout(() => connect(), 5_000);
    };
  };

  // ── Déconnexion propre ────────────────────────────────────────────────────
  const disconnect = () => {
    eventSource.value?.close();
    eventSource.value = null;
    isConnected.value = false;
  };

  // ── Marquer comme lus ─────────────────────────────────────────────────────
  const markAsRead = async (ids: string[]) => {
    // Mise à jour optimiste
    notifications.value = notifications.value.map(n =>
      ids.includes(n.id) ? { ...n, isRead: true } : n
    );
    try {
      await $fetch('/api/notifications/read', { method: 'POST', body: { ids } });
    } catch (e) {
      console.warn('[Notifications] Erreur markAsRead:', e);
    }
  };

  const markAllAsRead = async () => {
    notifications.value = notifications.value.map(n => ({ ...n, isRead: true }));
    try {
      await $fetch('/api/notifications/read', { method: 'POST', body: { all: true } });
    } catch (e) {
      console.warn('[Notifications] Erreur markAllAsRead:', e);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const iconForType = (type: string): string => {
    const icons: Record<string, string> = {
      forum_reply:       'i-lucide:message-circle',
      forum_ticket:      'i-lucide:ticket',
      moderation_alert:  'i-lucide:shield-alert',
      ticket_resolved:   'i-lucide:check-circle',
      new_mail:          'i-lucide:mail',
      system:            'i-lucide:info',
      warning:           'i-lucide:triangle-alert',
    };
    return icons[type] || 'i-lucide:bell';
  };

  const colorForType = (type: string): string => {
    const colors: Record<string, string> = {
      moderation_alert: 'error',
      warning:          'warning',
      ticket_resolved:  'success',
      new_mail:         'primary',
      forum_reply:      'info',
    };
    return colors[type] || 'neutral';
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    loadNotifications,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    iconForType,
    colorForType,
  };
};

<script setup lang="ts">
/**
 * components/Dashboard/NotificationBell.vue
 *
 * 🔔 Cloche de Notifications — Composant du navbar dashboard
 *
 * Affiche :
 *   - Un badge rouge avec le nombre de notifs non lues
 *   - Un popover avec la liste des dernières notifications
 *   - Chaque notif est cliquable (redirige vers actionUrl)
 *
 * Se connecte au SSE via useNotifications() et se déconnecte proprement.
 */

const { 
  notifications, 
  unreadCount, 
  isConnected,
  loadNotifications,
  connect,
  disconnect,
  markAsRead,
  markAllAsRead,
  iconForType,
  colorForType,
} = useNotifications()

const localePath = useLocalePath()
const router = useRouter()
const isOpen = ref(false)
const target = ref(null)

onClickOutside(target, () => {
  isOpen.value = false
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadNotifications()
  connect()
})

onUnmounted(() => {
  // Pas de déconnexion ici — le composable gère le singleton
  // La déconnexion n'est appelée que lors du logout
})

// ── Interactions ──────────────────────────────────────────────────────────────
const handleOpen = () => {
  isOpen.value = !isOpen.value
}

const handleNotificationClick = async (notif: any) => {
  if (!notif.isRead) {
    await markAsRead([notif.id])
  }
  isOpen.value = false
  if (notif.actionUrl) {
    router.push(localePath(notif.actionUrl))
  }
}

const handleMarkAllRead = async () => {
  await markAllAsRead()
}

// ── Formatage de la date ──────────────────────────────────────────────────────
const formatRelative = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `il y a ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `il y a ${diffHours}h`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}
</script>

<template>
  <div class="relative">
    <!-- ── Déclencheur (Bell Button) ────────────────────────────────────────── -->
    <UButton
      id="notification-bell-btn"
      color="neutral"
      variant="ghost"
      square
      :aria-label="`${unreadCount} notifications non lues`"
      @click="handleOpen"
    >
      <UChip
        :show="unreadCount > 0"
        :text="unreadCount > 9 ? '9+' : String(unreadCount)"
        color="error"
        inset
        size="sm"
      >
        <UIcon name="i-lucide:bell" class="size-5" :class="{ 'animate-bounce': unreadCount > 0 && !isOpen }" />
      </UChip>
    </UButton>

    <!-- ── Indicateur de connexion SSE ──────────────────────────────────────── -->
    <span
      class="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background"
      :class="isConnected ? 'bg-success-500' : 'bg-neutral-400'"
      :title="isConnected ? 'Temps réel activé' : 'Reconnexion...'"
    />

    <!-- ── Popover Notifications ─────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        ref="target"
        class="absolute right-0 top-full mt-2 w-80 z-50 origin-top-right"
      >
        <UCard
          class="shadow-xl border border-default bg-background/95 backdrop-blur-md overflow-hidden"
          :ui="{ body: 'p-0' }"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-default">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm text-highlighted">Notifications</span>
              <UBadge v-if="unreadCount > 0" :label="String(unreadCount)" color="error" size="xs" variant="solid" />
            </div>
            <UButton
              v-if="unreadCount > 0"
              variant="ghost"
              color="neutral"
              size="xs"
              label="Tout lire"
              @click="handleMarkAllRead"
            />
          </div>

          <!-- Liste -->
          <div class="max-h-80 overflow-y-auto divide-y divide-default">
            <!-- Vide -->
            <div v-if="notifications.length === 0" class="text-center py-8">
              <UIcon name="i-lucide:bell-off" class="size-8 text-dimmed mx-auto mb-2" />
              <p class="text-sm text-dimmed">Aucune notification</p>
            </div>

            <!-- Items -->
            <button
              v-for="notif in notifications.slice(0, 15)"
              :key="notif.id"
              class="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors group"
              :class="{ 'bg-primary-50/30 dark:bg-primary-900/10': !notif.isRead }"
              @click="handleNotificationClick(notif)"
            >
              <div class="flex items-start gap-3">
                <!-- Icone du type -->
                <div
                  class="shrink-0 mt-0.5 size-8 rounded-full flex items-center justify-center"
                  :class="`bg-${colorForType(notif.type)}-100 dark:bg-${colorForType(notif.type)}-900/30`"
                >
                  <UIcon
                    :name="iconForType(notif.type)"
                    class="size-4"
                    :class="`text-${colorForType(notif.type)}-600 dark:text-${colorForType(notif.type)}-400`"
                  />
                </div>

                <!-- Contenu -->
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-medium text-highlighted leading-tight truncate"
                    :class="{ 'text-default': notif.isRead }"
                  >
                    {{ notif.title }}
                  </p>
                  <p v-if="notif.body" class="text-xs text-muted mt-0.5 truncate">{{ notif.body }}</p>
                  <p class="text-[10px] text-dimmed mt-1">{{ formatRelative(notif.createdAt) }}</p>
                </div>

                <!-- Dot non-lu -->
                <div v-if="!notif.isRead" class="shrink-0 mt-2 size-2 rounded-full bg-primary-500" />
              </div>
            </button>
          </div>

          <!-- Footer -->
          <div v-if="notifications.length > 15" class="border-t border-default px-4 py-2 text-center">
            <NuxtLink :to="localePath('/dashboard/notifications')" class="text-xs text-primary hover:underline" @click="isOpen = false">
              Voir toutes les notifications
            </NuxtLink>
          </div>
        </UCard>
      </div>
    </Transition>
  </div>
</template>

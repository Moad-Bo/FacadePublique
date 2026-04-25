<script setup lang="ts">
/**
 * pages/dashboard/moderation/global-mod.vue
 *
 * 🛡️ File de Modération — Back-Office
 *
 * Protégée par la permission 'support:chat'.
 * Route préservée via definePageMeta({ path }) : /dashboard/moderation
 */

definePageMeta({
  layout: 'dashboard',
  title: 'Modération',
  middleware: ['permission'],
  requiredPermission: 'support:chat',
  path: '/dashboard/moderation',
})

const { hasPermission } = useSession()
const localePath = useLocalePath()

// ── State ─────────────────────────────────────────────────────────────────────
const activeStatus = ref<'pending' | 'resolved' | 'dismissed'>('pending')
const activeTargetType = ref<'all' | 'thread' | 'reply'>('all')
const selectedItem = ref<any>(null)
const isActionModalOpen = ref(false)
const actionType = ref<'resolve' | 'dismiss'>('resolve')
const isProcessing = ref(false)
const page = ref(1)

// ── Fetch moderation queue ────────────────────────────────────────────────────
const { data, pending, refresh } = await useAsyncData<any, any>(
  `moderation-${activeStatus.value}-${activeTargetType.value}-${page.value}`,
  () => $fetch<any>('/api/admin/moderation', {
    query: {
      status: activeStatus.value,
      ...(activeTargetType.value !== 'all' && { targetType: activeTargetType.value }),
      page: page.value,
      limit: 20,
    }
  }),
  { watch: [activeStatus, activeTargetType, page] }
)

const items = computed(() => (data.value as any)?.items || [])

// ── Tabs ──────────────────────────────────────────────────────────────────────
const statusTabs = [
  { value: 'pending', label: 'En attente', icon: 'i-lucide:clock' },
  { value: 'resolved', label: 'Résolus', icon: 'i-lucide:check-circle' },
  { value: 'dismissed', label: 'Ignorés', icon: 'i-lucide:x-circle' },
]

// ── Actions ───────────────────────────────────────────────────────────────────
const openAction = (item: any, action: 'resolve' | 'dismiss') => {
  selectedItem.value = item
  actionType.value = action
  isActionModalOpen.value = true
}

const confirmAction = async () => {
  if (!selectedItem.value) return
  isProcessing.value = true
  try {
    await $fetch(`/api/admin/moderation/${selectedItem.value.id}`, {
      method: 'POST',
      body: { action: actionType.value }
    })
    isActionModalOpen.value = false
    selectedItem.value = null
    await refresh()
  } catch (e: any) {
    console.error('Moderation action failed:', e)
  } finally {
    isProcessing.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const reasonLabels: Record<string, { label: string; color: string; icon: string }> = {
  spam:           { label: 'Spam',          color: 'warning', icon: 'i-lucide:mail-x' },
  harassment:     { label: 'Harcèlement',   color: 'error',   icon: 'i-lucide:alert-triangle' },
  misinformation: { label: 'Désinformation',color: 'orange',  icon: 'i-lucide:info' },
  other:          { label: 'Autre',          color: 'neutral', icon: 'i-lucide:help-circle' },
}

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- ── Header page ────────────────────────────────────────────────────────── -->
    <div class="px-6 pt-6 pb-4 border-b border-default bg-background/60 backdrop-blur-sm shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <UIcon name="i-lucide:shield-alert" class="size-5 text-error-600 dark:text-error-400" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-highlighted">File de Modération</h1>
            <p class="text-sm text-muted">Signalements des contenus du forum communautaire</p>
          </div>
        </div>

        <!-- Badge pending count -->
        <UBadge
          v-if="activeStatus === 'pending' && items.length > 0"
          :label="`${items.length} signalement${items.length > 1 ? 's' : ''} en attente`"
          color="error"
          variant="subtle"
          size="lg"
          icon="i-lucide:alert-circle"
        />
      </div>

      <!-- Info contextuelle -->
      <UAlert
        class="mt-4"
        color="info"
        variant="subtle"
        icon="i-lucide:info"
        title="Périmètre de cette page"
        description="Cette file gère les signalements issus du forum. Les emails externes (Gmail, formulaire de contact) sont traités dans le Webmailer. Les tickets de support et mentions @support du forum remontent ici automatiquement."
      />
    </div>

    <div class="flex flex-col gap-4 p-6 flex-1 overflow-y-auto">
      <!-- ── Filtres ──────────────────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Status tabs -->
        <div class="flex bg-muted rounded-lg p-1 gap-1">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="activeStatus === tab.value
              ? 'bg-background text-highlighted shadow-sm'
              : 'text-muted hover:text-default'"
            @click="activeStatus = tab.value as any; page = 1"
          >
            <UIcon :name="tab.icon" class="size-3.5" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Type filter -->
        <div class="flex gap-2">
          <UButton
            v-for="t in ['all', 'thread', 'reply']"
            :key="t"
            size="sm"
            :variant="activeTargetType === t ? 'solid' : 'outline'"
            :color="activeTargetType === t ? 'primary' : 'neutral'"
            :label="t === 'all' ? 'Tous' : t === 'thread' ? 'Sujets' : 'Réponses'"
            @click="activeTargetType = t as any; page = 1"
          />
        </div>

        <div class="ml-auto">
          <UButton
            icon="i-lucide:refresh-cw"
            size="sm"
            variant="ghost"
            color="neutral"
            :loading="pending"
            @click="() => refresh()"
          />
        </div>
      </div>

      <!-- ── Liste des signalements ───────────────────────────────────────────── -->
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-24 rounded-xl" />
      </div>

      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <div class="size-16 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center mb-4">
          <UIcon name="i-lucide:shield-check" class="size-8 text-success-600 dark:text-success-400" />
        </div>
        <h3 class="text-lg font-semibold text-highlighted mb-1">File vide</h3>
        <p class="text-sm text-muted">Aucun signalement {{ activeStatus === 'pending' ? 'en attente' : activeStatus === 'resolved' ? 'résolu' : 'ignoré' }}.</p>
      </div>

      <div v-else class="space-y-3">
        <UCard
          v-for="item in items"
          :key="item.id"
          class="hover:shadow-md transition-shadow border border-default"
          :class="{ 'border-l-4 border-l-error-500': activeStatus === 'pending' }"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-start gap-4">
            <!-- Raison badge -->
            <div class="shrink-0">
              <UBadge
                :label="reasonLabels[item.reason]?.label || item.reason"
                :color="(reasonLabels[item.reason]?.color as any) || 'neutral'"
                :icon="reasonLabels[item.reason]?.icon"
                variant="subtle"
                size="sm"
              />
            </div>

            <!-- Contenu -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <UBadge
                  :label="item.targetType === 'thread' ? 'Sujet' : 'Réponse'"
                  color="neutral"
                  variant="outline"
                  size="xs"
                />
                <span class="text-xs text-dimmed font-mono">{{ item.targetId.substring(0, 8) }}…</span>
              </div>
              <p v-if="item.details" class="text-sm text-default mb-2 line-clamp-2">
                "{{ item.details }}"
              </p>
              <div class="flex items-center gap-3 text-xs text-muted">
                <div class="flex items-center gap-1">
                  <UAvatar :src="item.reportedBy?.image" :alt="item.reportedBy?.name" size="2xs" />
                  <span>{{ item.reportedBy?.name }}</span>
                </div>
                <span>•</span>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>

            <!-- Actions (pending only) -->
            <div v-if="activeStatus === 'pending'" class="shrink-0 flex gap-2">
              <UButton
                size="sm"
                color="success"
                variant="soft"
                icon="i-lucide:check"
                label="Résoudre"
                @click="openAction(item, 'resolve')"
              />
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-lucide:x"
                label="Ignorer"
                @click="openAction(item, 'dismiss')"
              />
            </div>

            <!-- Status badge (non-pending) -->
            <div v-else class="shrink-0">
              <UBadge
                :label="item.status === 'resolved' ? 'Résolu' : 'Ignoré'"
                :color="item.status === 'resolved' ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- ── Modal de confirmation d'action ──────────────────────────────────────── -->
    <UModal v-model:open="isActionModalOpen">
      <template #content>
        <UCard :ui="{ body: 'p-6' }">
          <div class="flex items-start gap-4 mb-6">
            <div
              class="size-12 rounded-full flex items-center justify-center shrink-0"
              :class="actionType === 'resolve' ? 'bg-success-100 dark:bg-success-900/30' : 'bg-neutral-100 dark:bg-neutral-800'"
            >
              <UIcon
                :name="actionType === 'resolve' ? 'i-lucide:check-circle' : 'i-lucide:x-circle'"
                :class="actionType === 'resolve' ? 'text-success-600 size-6' : 'text-muted size-6'"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-highlighted mb-1">
                {{ actionType === 'resolve' ? 'Résoudre le signalement' : 'Ignorer le signalement' }}
              </h3>
              <p class="text-sm text-muted">
                <template v-if="actionType === 'resolve'">
                  Le contenu sera fermé/masqué et l'auteur recevra une notification.
                </template>
                <template v-else>
                  Le signalement sera marqué comme non-pertinent. Le contenu reste visible.
                </template>
              </p>
            </div>
          </div>

          <div class="flex gap-3 justify-end">
            <UButton
              variant="ghost"
              color="neutral"
              label="Annuler"
              @click="isActionModalOpen = false"
            />
            <UButton
              :color="actionType === 'resolve' ? 'success' : 'neutral'"
              :label="actionType === 'resolve' ? 'Confirmer la résolution' : 'Confirmer l\'ignorance'"
              :loading="isProcessing"
              @click="confirmAction"
            />
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

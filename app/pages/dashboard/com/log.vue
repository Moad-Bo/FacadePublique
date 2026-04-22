<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TableColumn } from '@nuxt/ui';

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: 'manage_mail',
  title: 'Historique des Emails'
});

const localePath = useLocalePath();
const notify = useNotify();

// --- DATA FETCHING ---
const { data: logs, refresh: refreshLogs, pending: loadingLogs } = await useFetch<any[]>('/api/mails/logs', { 
  lazy: true, 
  default: () => [] 
});

const { data: queue, refresh: refreshQueue, pending: loadingQueue } = await useFetch<any[]>('/api/mails/queue', { 
  lazy: true, 
  default: () => [] 
});

// --- TABS & FILTERING ---
const activeTab = ref('history');
const tabs = [
  { label: 'Journal d\'envoi', value: 'history', icon: 'i-lucide:scroll-text' },
  { label: 'Emails programmés', value: 'queue', icon: 'i-lucide:calendar-clock' }
];

const filterType = ref<'all' | 'system' | 'newsletter' | 'contact' | 'notification' | 'mod-forum'>('all');
const types = [
  { label: 'Tous', value: 'all' },
  { label: 'Système', value: 'system' },
  { label: 'Newsletter', value: 'newsletter' },
  { label: 'Contact', value: 'contact' },
  { label: 'Modération', value: 'mod-forum' },
  { label: 'Notifications', value: 'notification' }
];

const filteredLogs = computed(() => {
  if (filterType.value === 'all') return logs.value;
  return logs.value.filter(l => l.type === filterType.value);
});

const filteredQueue = computed(() => {
  if (filterType.value === 'all') return queue.value;
  return queue.value.filter(q => q.type === filterType.value);
});

// --- TABLE COLUMNS ---
const logColumns: TableColumn<any>[] = [
  { accessorKey: 'recipient', header: 'Destinataire' },
  { accessorKey: 'subject', header: 'Objet' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'status', header: 'Statut' },
  { accessorKey: 'sentAt', header: 'Date' }
];

const queueColumns: TableColumn<any>[] = [
  { accessorKey: 'recipient', header: 'Destinataire' },
  { accessorKey: 'subject', header: 'Objet' },
  { accessorKey: 'status', header: 'Statut' },
  { accessorKey: 'scheduledAt', header: 'Prévu pour' },
  { accessorKey: 'retryCount', header: 'Essais' },
  { accessorKey: 'actions', header: '' }
];

// --- UTILS ---
function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  }).format(new Date(dateStr));
}

const cancelScheduled = async (id: string) => {
    if (!confirm('Annuler cet envoi programmé ?')) return;
    try {
        await $fetch(`/api/mails/admin-queue`, {
            method: 'POST',
            body: { action: 'cancel', ids: [id] }
        });
        notify.success('Envoi annulé');
        refreshQueue();
    } catch (e: any) {
        notify.error('Erreur', e.message);
    }
}
</script>

<template>
  <UDashboardPanel grow>
    <UDashboardNavbar title="Historique & Programmation">

      <template #right>
        <div class="flex items-center gap-2">
            <USelect v-model="filterType" :items="types" size="sm" class="w-40" />
            <UButton 
              icon="i-lucide:refresh-cw" 
              variant="soft" 
              color="neutral" 
              size="sm" 
              :loading="loadingLogs || loadingQueue"
              @click="() => { refreshLogs(); refreshQueue(); }" 
            />
        </div>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 flex flex-col min-h-0 bg-neutral-50/50 dark:bg-neutral-950/20">
      <div class="p-6">
          <UTabs v-model="activeTab" :items="tabs" class="w-full" />
      </div>

      <div class="flex-1 overflow-auto px-6 pb-6">
        <!-- HISTORY TABLE -->
        <UCard v-if="activeTab === 'history'" class="overflow-hidden" :ui="{ body: 'p-0' }">
          <UTable :data="filteredLogs" :columns="logColumns" class="w-full">
            <template #recipient-data="{ row }">
               <div class="flex flex-col">
                  <span class="font-bold text-highlighted">{{ row.original.recipient }}</span>
               </div>
            </template>
            <template #type-data="{ row }">
              <UBadge 
                :label="row.original.type" 
                size="xs" 
                variant="soft" 
                :color="row.original.type === 'system' ? 'neutral' : row.original.type === 'newsletter' ? 'primary' : row.original.type === 'contact' ? 'success' : row.original.type === 'mod-forum' ? 'warning' : 'info'" 
              />
            </template>
            <template #status-data="{ row }">
              <UBadge 
                :label="row.original.status" 
                size="xs" 
                variant="soft"
                :color="row.original.status === 'sent' ? 'success' : row.original.status === 'failed' ? 'error' : row.original.status === 'delivered' ? 'primary' : 'neutral'" 
              />
            </template>
            <template #sentAt-data="{ row }">
              <span class="text-xs font-mono text-dimmed">{{ formatDate(row.original.sentAt) }}</span>
            </template>
          </UTable>
          <div v-if="filteredLogs.length === 0" class="p-20 text-center text-dimmed">
              <UIcon name="i-lucide:scroll-text" class="size-12 opacity-20 mb-2" />
              <p>Aucun log trouvé pour cette catégorie.</p>
          </div>
        </UCard>

        <!-- QUEUE TABLE -->
        <UCard v-else class="overflow-hidden" :ui="{ body: 'p-0' }">
          <UTable :data="filteredQueue" :columns="queueColumns" class="w-full">
             <template #recipient-data="{ row }">
               <span class="font-bold">{{ row.original.recipient }}</span>
            </template>
            <template #status-data="{ row }">
              <UBadge 
                :label="row.original.status" 
                size="xs" 
                :color="row.original.status === 'pending' ? 'primary' : row.original.status === 'locked' ? 'warning' : row.original.status === 'cancelled' ? 'neutral' : 'error'" 
                variant="subtle"
              />
            </template>
            <template #scheduledAt-data="{ row }">
              <span class="text-xs font-bold text-primary">{{ formatDate(row.original.scheduledAt) }}</span>
            </template>
            <template #retryCount-data="{ row }">
               <span class="text-xs text-dimmed leading-none">{{ row.original.retryCount || 0 }}/3</span>
            </template>
            <template #actions-data="{ row }">
               <UButton 
                 v-if="row.original.status === 'pending'" 
                 icon="i-lucide:trash-2" 
                 variant="ghost" 
                 color="error" 
                 size="xs" 
                 @click="cancelScheduled(row.original.id)" 
               />
            </template>
          </UTable>
          <div v-if="filteredQueue.length === 0" class="p-20 text-center text-dimmed">
              <UIcon name="i-lucide:calendar-clock" class="size-12 opacity-20 mb-2" />
              <p>Aucun email programmé en attente.</p>
          </div>
        </UCard>
      </div>
    </div>
  </UDashboardPanel>
</template>

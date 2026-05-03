<script setup lang="ts">
import { ref, computed } from 'vue';

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: 'manage_mail',
  title: 'Mail Metric & Logs'
});

const notify = useNotify();

// --- UI STATE ---
const activeView = ref<'journal' | 'queue' | 'archive'>('journal');
const searchQuery = ref('');
const filterContext = ref<any>(null); 
const contextMode = ref<'all' | 'webmailer' | 'campaign'>('all');
const isMetricSidebarCollapsed = ref(false);
const isExportModalOpen = ref(false);
const isCancelModalOpen = ref(false);
const itemsToCancel = ref<any[]>([]);

// --- DATE FILTER ---
const dateFrom = ref<string>('');
const dateTo = ref<string>('');

// --- DATA FETCHING ---
const { data: logsData, refresh: refreshLogs, pending: loadingLogs } = await useFetch<any>('/api/mails/logs', { 
  lazy: true,
  query: { 
    dateFrom, 
    dateTo,
    period: '30d'
  },
  default: () => ({ logs: [], stats: { outgoing: 0, incoming: 0 } }) 
});

const { data: queue, refresh: refreshQueue, pending: loadingQueue } = await useFetch<any[]>('/api/mails/queue', { 
  lazy: true, 
  default: () => [] 
});

// --- MULTI-SELECTION & ACTIONS ---
const selectedItems = ref<string[]>([]);
const toggleSelection = (id: string) => {
  if (selectedItems.value.includes(id)) {
    selectedItems.value = selectedItems.value.filter(i => i !== id);
  } else {
    selectedItems.value.push(id);
  }
};

const isAllSelected = computed(() => {
  const list = activeView.value === 'queue' ? processedQueue.value : [];
  return list.length > 0 && list.every((i: any) => selectedItems.value.includes(i.id));
});

const isIndeterminate = computed(() => {
  const list = activeView.value === 'queue' ? processedQueue.value : [];
  return selectedItems.value.length > 0 && !isAllSelected.value;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = [];
  } else if (activeView.value === 'queue') {
    selectedItems.value = processedQueue.value.map((i: any) => i.id);
  }
};

const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success('Export de sauvegarde généré');
};

const openCancelModal = () => {
  if (selectedItems.value.length === 0) return;
  itemsToCancel.value = (queue.value || []).filter((c: any) => selectedItems.value.includes(c.id));
  isCancelModalOpen.value = true;
};

const handleCancelConfirmed = async () => {
  const ids = itemsToCancel.value.map(i => i.id);
  try {
    await $fetch(`/api/mails/admin-queue`, {
      method: 'POST',
      body: { action: 'delete', ids }
    });
    notify.success('Programmations annulées');
    selectedItems.value = selectedItems.value.filter(id => !ids.includes(id));
    refreshQueue();
  } catch (e: any) {
    notify.error('Erreur', e.message);
  }
};

watch(activeView, () => {
  selectedItems.value = [];
});

// --- DYNAMIC STATS ---
const activeStats = computed(() => {
  if (activeView.value === 'journal' || activeView.value === 'archive') {
    const stats = (logsData.value as any)?.stats || { incoming: 0, outgoing: 0 };
    return [
       { label: 'Messages Envoyés', value: stats.outgoing, icon: 'i-lucide:arrow-up-right', color: 'primary' },
       { label: 'Messages Reçus', value: stats.incoming, icon: 'i-lucide:arrow-down-left', color: 'success' },
       { label: 'Volume Total', value: stats.outgoing + stats.incoming, icon: 'i-lucide:database', color: 'neutral' }
    ]
  }
  if (activeView.value === 'queue') {
    const list = (queue.value as any) || [];
    return [
       { label: 'En attente', value: list.filter((l:any) => l.status === 'pending').length, icon: 'i-lucide:clock', color: 'primary' },
       { label: 'Échecs / Erreurs', value: list.filter((l:any) => l.status === 'failed').length, icon: 'i-lucide:alert-circle', color: 'error' },
       { label: 'Total File', value: list.length, icon: 'i-lucide:list-ordered', color: 'neutral' }
    ]
  }
  return [];
});

// --- GROUPS FOR FILTER ---
const contextItems = computed(() => {
  const buildGroup = (title: string, items: any[]): any[] => [
    { label: title, disabled: true, class: 'font-black uppercase tracking-widest text-[9px] text-primary bg-transparent pt-3 pb-1', value: '', icon: '' },
    ...items.map(i => ({ label: i.label, value: i.value || i.label, icon: i.icon || 'i-lucide:tag' }))
  ];

  const webmailerItems = [
    { label: 'contact', icon: 'i-lucide:user' },
    { label: 'moderation', icon: 'i-lucide:shield' },
    { label: 'support', icon: 'i-lucide:life-buoy' },
    { label: 'system', icon: 'i-lucide:cpu' }
  ];
  
  const campaignItems = [
    { label: 'marketing', icon: 'i-lucide:megaphone' },
    { label: 'newsletter', icon: 'i-lucide:mail-open' },
    { label: 'changelog', icon: 'i-lucide:history' }
  ];

  const groups = [[{ label: 'Tous les contextes', value: 'all', icon: 'i-lucide:globe' }]];

  if (contextMode.value === 'all' || contextMode.value === 'webmailer') {
    groups.push(buildGroup('Webmailer & Support', webmailerItems));
  }
  if (contextMode.value === 'all' || contextMode.value === 'campaign') {
    groups.push(buildGroup('Campagnes', campaignItems));
  }
  
  const allLogs = (logsData.value as any)?.logs || [];
  const known = [...webmailerItems, ...campaignItems].map(i => i.label);
  const foundAliases = Array.from(new Set(allLogs.map((l: any) => l.context))) as string[];
  const archiveAliases = foundAliases.filter(a => a && !known.includes(a));
  
  if (archiveAliases.length > 0) {
    groups.push(buildGroup('Archives (Inactifs)', archiveAliases.map(a => ({ label: a }))));
  }

  return groups;
});


// --- FILTERING & PAGINATION FOR JOURNAL ---
const journalPage = ref(1);
const itemsPerPage = 12;

const processedJournal = computed(() => {
  let list = (logsData.value as any)?.logs || [];

  const webmailerBase = ['contact', 'moderation', 'support', 'system', 'webmailer'];
  const campaignBase = ['campaign_newsletter', 'campaign_changelog', 'campaign_promo', 'campaign', 'campaign_batch', 'marketing', 'newsletter', 'changelog'];

  // Mode filtering
  if (contextMode.value === 'webmailer') {
    list = list.filter((l: any) => webmailerBase.includes(l.context));
  } else if (contextMode.value === 'campaign') {
    list = list.filter((l: any) => campaignBase.includes(l.context));
  }

  // Split view filtering (Journal vs Archive)
  if (activeView.value === 'archive') {
    list = list.filter((l: any) => !webmailerBase.includes(l.context) && !campaignBase.includes(l.context));
  } else if (activeView.value === 'journal') {
    list = list.filter((l: any) => webmailerBase.includes(l.context) || campaignBase.includes(l.context));
  }

  // UI select filter
  if (filterContext.value && filterContext.value.value !== 'all') {
    list = list.filter((l: any) => l.context === filterContext.value.value);
  }

  // Date Range Search
  if (dateFrom.value) {
    const from = new Date(dateFrom.value);
    list = list.filter((l: any) => l.date && new Date(l.date) >= from);
  }
  if (dateTo.value) {
    const to = new Date(dateTo.value);
    to.setHours(23, 59, 59, 999);
    list = list.filter((l: any) => l.date && new Date(l.date) <= to);
  }

  // Text Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((l: any) => 
      (l.subject && l.subject.toLowerCase().includes(q)) ||
      (l.to && l.to.toLowerCase().includes(q)) ||
      (l.from && l.from.toLowerCase().includes(q))
    );
  }
  
  return list;
});

const paginatedJournal = computed(() => {
  const start = (journalPage.value - 1) * itemsPerPage;
  return processedJournal.value.slice(start, start + itemsPerPage);
});

// Watchers pour reset la pagination si on cherche
watch([searchQuery, filterContext, activeView, contextMode, dateFrom, dateTo], () => {
   journalPage.value = 1;
   queuePage.value = 1;
});


// --- QUEUE PAGINATION ---
const queuePage = ref(1);
const processedQueue = computed(() => {
  let list = queue.value || [];

  // Mode filtering
  const webmailerBase = ['contact', 'moderation', 'support', 'system', 'webmailer'];
  const campaignBase = ['campaign_newsletter', 'campaign_changelog', 'campaign_promo', 'campaign', 'campaign_batch', 'marketing', 'newsletter', 'changelog'];

  if (contextMode.value === 'webmailer') {
    list = list.filter((l: any) => webmailerBase.includes(l.fromContext || l.type));
  } else if (contextMode.value === 'campaign') {
    list = list.filter((l: any) => campaignBase.includes(l.fromContext || l.type));
  }

  // UI select filter
  if (filterContext.value && filterContext.value.value !== 'all') {
    list = list.filter((l: any) => (l.fromContext || l.type) === filterContext.value.value);
  }

  // Text Search
  if (searchQuery.value) {
     const q = searchQuery.value.toLowerCase();
     list = list.filter((l: any) => 
       l.subject?.toLowerCase().includes(q) || 
       l.recipient?.toLowerCase().includes(q)
     );
  }
  
  if (dateFrom.value) {
    const from = new Date(dateFrom.value);
    list = list.filter((l: any) => l.scheduledAt && new Date(l.scheduledAt) >= from);
  }
  if (dateTo.value) {
    const to = new Date(dateTo.value);
    to.setHours(23, 59, 59, 999);
    list = list.filter((l: any) => l.scheduledAt && new Date(l.scheduledAt) <= to);
  }

  return list;
});
const paginatedQueue = computed(() => {
  const start = (queuePage.value - 1) * itemsPerPage;
  return processedQueue.value.slice(start, start + itemsPerPage);
});

// --- COLUMNS ---
const queueColumns = [
  { accessorKey: 'selection', header: '' },
  { accessorKey: 'recipient', header: 'Destinataire' },
  { accessorKey: 'subject', header: 'Objet' },
  { accessorKey: 'status', header: 'Statut' },
  { accessorKey: 'scheduledAt', header: 'Prévu pour' },
  { accessorKey: 'retryCount', header: 'Essais' },
  { accessorKey: 'actions', header: '' }
];

const journalColumns = [
  { accessorKey: 'direction', header: '' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'context', header: 'Contexte' },
  { accessorKey: 'from', header: 'Expéditeur (De)' },
  { accessorKey: 'to', header: 'Destinataire (À)' },
  { accessorKey: 'subject', header: 'Objet' },
  { accessorKey: 'status', header: 'Statut' },
];

function formatDate(dateStr: any) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', month: 'short', 
    hour: '2-digit', minute: '2-digit' 
  }).format(new Date(dateStr));
}

const cancelScheduled = (item: any) => {
    itemsToCancel.value = [item];
    isCancelModalOpen.value = true;
}
</script>

<template>
  <div class="h-full w-full flex overflow-hidden">
    <!-- SUB-SIDEBAR : Navigation locale -->
    <aside 
      class="border-r border-default bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col shrink-0 transition-all duration-300"
      :class="[isMetricSidebarCollapsed ? 'w-16' : 'w-64']"
    >
      <div class="px-4 py-4 border-b border-default flex items-center justify-between">
         <h2 v-if="!isMetricSidebarCollapsed" class="font-black text-[10px] uppercase tracking-[0.2em] text-dimmed truncate">Mail Metric Nav</h2>
         <UButton 
          :icon="isMetricSidebarCollapsed ? 'i-lucide:panel-left-open' : 'i-lucide:panel-left-close'" 
          variant="ghost" 
          color="neutral" 
          size="xs"
          class="ml-auto"
          @click="isMetricSidebarCollapsed = !isMetricSidebarCollapsed" 
         />
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        <UButton
          v-for="link in [
            { id: 'journal', label: 'Journal unifié', icon: 'i-lucide:list', badge: processedJournal?.length },
            { id: 'queue', label: 'Programmations', icon: 'i-lucide:calendar-clock', badge: processedQueue?.length },
            { id: 'archive', label: 'Archives', icon: 'i-lucide:archive' }
          ]"
          :key="link.id"
          :icon="link.icon"
          :label="!isMetricSidebarCollapsed ? link.label : ''"
          :variant="activeView === link.id ? 'solid' : 'ghost'"
          :color="activeView === link.id ? 'primary' : 'neutral'"
          class="w-full justify-start py-2.5 font-bold"
          :class="[isMetricSidebarCollapsed ? 'px-0 justify-center' : 'px-4']"
          @click="activeView = link.id as any"
        >
          <template #trailing v-if="!isMetricSidebarCollapsed && link.badge !== undefined">
             <UBadge :label="String(link.badge)" size="xs" variant="subtle" class="ml-auto opacity-70" />
          </template>
        </UButton>
      </nav>
    </aside>

    <!-- CONTENT PANEL -->
    <main class="flex-1 flex flex-col min-w-0 bg-neutral-50/30 dark:bg-neutral-950/20 overflow-hidden">
      <!-- Nav Local -->
      <div class="px-6 py-4 flex items-center justify-between border-b border-default bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shrink-0">
          <div class="flex items-center gap-3">
             <UIcon :name="activeView === 'journal' ? 'i-lucide:list' : activeView === 'queue' ? 'i-lucide:calendar-clock' : 'i-lucide:archive'" class="size-5 text-primary" />
             <h2 class="font-black text-lg text-highlighted uppercase tracking-tight">
                {{ activeView === 'journal' ? 'Journal unifié' : activeView === 'queue' ? 'Programmations' : 'Archives' }}
             </h2>
          </div>
          <div class="flex items-center gap-2">
            <div v-if="selectedItems.length > 0" class="flex items-center gap-2 mr-4 animate-in fade-in slide-in-from-right-4">
              <span class="text-xs font-black text-primary">{{ selectedItems.length }} sélectionnés</span>
              <UButton v-if="activeView === 'queue'" label="Tout annuler" icon="i-lucide:trash-2" color="error" variant="soft" size="sm" @click="openCancelModal" />
              <UButton v-else label="Exporter sélectionnés" icon="i-lucide:download" color="primary" variant="soft" size="sm" @click="downloadCSV([], [], 'selected-logs')" />
            </div>
            <UButton 
                label="Exporter"
                icon="i-lucide:download" 
                variant="soft" 
                color="primary" 
                size="sm"
                class="font-bold"
                @click="isExportModalOpen = true" 
            />
            <UButton 
                icon="i-lucide:refresh-cw" 
                variant="outline" 
                color="neutral" 
                size="sm" 
                :loading="loadingLogs || loadingQueue"
                @click="() => { refreshLogs(); refreshQueue(); }" 
            />
          </div>
      </div>

      <!-- STATS BAR -->
      <div v-if="activeStats.length > 0" class="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50/20 dark:bg-neutral-900/10 shrink-0 border-b border-default">
          <div v-for="stat in activeStats" :key="stat.label" class="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-default shadow-sm transition-all hover:shadow-md flex items-center gap-4">
             <div class="size-10 rounded-xl flex items-center justify-center shrink-0" :class="[`bg-${stat.color}-500/10 text-${stat.color}-500`]">
                <UIcon :name="stat.icon" class="size-5" />
             </div>
             <div>
                <p class="text-[10px] font-black uppercase text-dimmed tracking-widest">{{ stat.label }}</p>
                <p class="text-xl font-black text-highlighted font-mono leading-tight">{{ stat.value }}</p>
             </div>
          </div>
      </div>

      <!-- FILTERS -->
      <div class="px-6 py-4 border-b border-default bg-neutral-50/50 dark:bg-neutral-900/40 flex flex-wrap gap-4 items-center">
          <div class="flex-1 min-w-[200px]">
            <UInput 
              v-model="searchQuery" 
              icon="i-lucide:search" 
              placeholder="Chercher par destinataire, sujet..." 
              variant="outline" 
              size="md"
              class="w-full bg-white dark:bg-neutral-900"
            />
          </div>

          <!-- FILTRE DATE -->
          <div class="flex items-center gap-2 bg-white dark:bg-neutral-900 p-1 rounded-lg border border-default shadow-sm px-2">
            <UInput v-model="dateFrom" type="date" size="sm" variant="none" class="w-32 text-xs" />
            <span class="text-xs text-dimmed">→</span>
            <UInput v-model="dateTo" type="date" size="sm" variant="none" class="w-32 text-xs" />
            <UButton v-if="dateFrom || dateTo" icon="i-lucide:x" size="xs" variant="ghost" color="neutral" @click="dateFrom = ''; dateTo = ''" />
          </div>
          
          <div class="flex items-center gap-2 bg-white dark:bg-neutral-900 p-1 rounded-lg border border-default shadow-sm">
             <template v-if="activeView !== 'queue'">
               <UButton 
                  v-for="mode in [
                    { id: 'all', icon: 'i-lucide:globe', tooltip: 'Tous' },
                    { id: 'webmailer', icon: 'i-lucide:inbox', tooltip: 'Webmailer' },
                    { id: 'campaign', icon: 'i-lucide:send', tooltip: 'Campagnes' }
                  ]"
                  :key="mode.id"
                  :icon="mode.icon"
                  size="xs"
                  :variant="contextMode === mode.id ? 'solid' : 'ghost'"
                  :color="contextMode === mode.id ? 'primary' : 'neutral'"
                  @click="contextMode = mode.id as any"
               />
               <div class="w-px h-4 bg-default mx-1" />
             </template>
             <USelectMenu 
               v-model="filterContext" 
               :items="contextItems" 
               placeholder="Contexte..." 
               class="min-w-[180px]"
               size="md"
               :ui-menu="{ width: 'w-64' }"
             >
                <template #leading>
                    <UIcon :name="filterContext?.icon || 'i-lucide:filter'" class="size-4" />
                </template>
             </USelectMenu>
          </div>
      </div>

      <!-- TABLE AREA -->
      <div class="flex-1 overflow-auto p-6">
        <!-- JOURNAL / ARCHIVE TABLE -->
        <template v-if="activeView === 'journal' || activeView === 'archive'">
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-default shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div class="flex-1 overflow-auto bg-white dark:bg-neutral-900">
                <UTable :data="paginatedJournal" :columns="journalColumns" class="w-full relative">

                   <template #direction-data="{ row }">
                      <div :class="[
                            'p-2 rounded-xl flex items-center justify-center shrink-0 size-9 shadow-inner',
                            row.original.direction === 'incoming' ? 'bg-success/10 text-success ring-1 ring-success/20' : 'bg-primary/10 text-primary ring-1 ring-primary/20'
                         ]">
                            <UIcon :name="row.original.direction === 'incoming' ? 'i-lucide:arrow-down-left' : 'i-lucide:arrow-up-right'" class="size-4" />
                      </div>
                   </template>

                   <template #to-data="{ row }">
                      <span class="font-black text-highlighted">
                        <template v-if="row.original.to === '__batch__'">
                          <UBadge size="xs" variant="soft" color="info" class="font-black uppercase tracking-widest text-[10px]">
                            <UIcon name="i-lucide:users" class="mr-1 size-3"/> Envoi de Masse
                          </UBadge>
                        </template>
                        <template v-else>{{ row.original.to }}</template>
                      </span>
                   </template>

                   <template #date-data="{ row }">
                     <span class="text-xs font-black text-dimmed whitespace-nowrap">{{ formatDate(row.original.date) }}</span>
                   </template>

                   <template #context-data="{ row }">
                     <UBadge :label="String(row.original.context || '')" variant="soft" color="neutral" size="xs" class="uppercase font-black tracking-widest text-[8px] px-2 py-0.5" />
                   </template>

                   <template #from-data="{ row }">
                     <span class="font-bold text-sm text-highlighted max-w-[200px] truncate block">{{ row.original.from || '-' }}</span>
                   </template>

                   <template #status-data="{ row }">
                     <UBadge 
                       :label="String(row.original.status || 'inconnu')" 
                       size="xs" 
                       variant="subtle"
                       :color="['sent', 'delivered'].includes(String(row.original.status)) ? 'success' : String(row.original.status) === 'failed' ? 'error' : 'neutral'" 
                       class="font-black uppercase text-[8px]"
                     />
                   </template>
                </UTable>

                <div v-if="processedJournal.length === 0" class="p-24 text-center text-dimmed flex flex-col items-center justify-center">
                   <div class="size-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                      <UIcon name="i-lucide:inbox" class="size-10 opacity-30" />
                   </div>
                   <p class="font-black text-xl text-highlighted uppercase tracking-tight">Aucune trace trouvée</p>
                </div>
            </div>

            <!-- FOOTER PAGINATION -->
            <div class="px-6 py-4 border-t border-default flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30 shrink-0">
               <p class="text-xs text-dimmed">Total : <span class="font-bold text-default">{{ processedJournal.length }}</span> logs</p>
               <UPagination v-model:page="journalPage" :total="processedJournal.length" :items-per-page="itemsPerPage" show-edges :sibling-count="1" size="sm" color="neutral" active-color="primary" />
            </div>
          </div>
        </template>

        <!-- QUEUE TABLE -->
        <template v-else-if="activeView === 'queue'">
           <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-default shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div class="flex-1 overflow-auto bg-white dark:bg-neutral-900">
               <UTable :data="paginatedQueue" :columns="queueColumns" class="w-full">
                  <template #selection-header>
                    <UCheckbox :model-value="isAllSelected" :indeterminate="isIndeterminate" @change="toggleSelectAll" />
                  </template>
                  <template #selection-data="{ row }">
                    <UCheckbox :model-value="selectedItems.includes(row.original.id as string)" @change="toggleSelection(row.original.id as string)" />
                  </template>
                  <template #recipient-data="{ row }">
                    <span class="font-black text-highlighted">{{ row.original.recipient }}</span>
                 </template>
                 <template #status-data="{ row }">
                   <UBadge 
                     :label="String(row.original.status || '')" 
                     size="xs" 
                     :color="row.original.status === 'pending' ? 'primary' : row.original.status === 'locked' ? 'warning' : row.original.status === 'cancelled' ? 'neutral' : 'error'" 
                     variant="soft"
                     class="font-black uppercase text-[8px]"
                   />
                 </template>
                 <template #scheduledAt-data="{ row }">
                    <div class="flex items-center gap-2">
                       <UIcon name="i-lucide:calendar" class="size-3.5 text-primary" />
                       <span class="text-xs font-black text-primary">{{ formatDate(String(row.original.scheduledAt)) }}</span>
                    </div>
                 </template>
                 <template #actions-data="{ row }">
                    <UButton 
                      v-if="row.original.status === 'pending'" 
                      icon="i-lucide:trash-2" 
                      variant="ghost" 
                      color="error" 
                      size="sm" 
                      class="hover:bg-error/10"
                      @click="cancelScheduled(row.original)" 
                    />
                 </template>
               </UTable>

               <div v-if="processedQueue.length === 0" class="p-24 text-center text-dimmed flex flex-col items-center justify-center">
                   <div class="size-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                     <UIcon name="i-lucide:calendar-clock" class="size-10 opacity-30" />
                   </div>
                   <p class="font-black text-xl text-highlighted uppercase tracking-tight">File d'attente vide</p>
               </div>
            </div>
            
            <div class="px-6 py-4 border-t border-default flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50 shrink-0">
               <p class="text-xs text-dimmed font-black uppercase tracking-widest">
                  Total : {{ processedQueue.length }} programmation(s)
               </p>
               <UPagination v-model:page="queuePage" :total="processedQueue.length" :items-per-page="itemsPerPage" show-edges :sibling-count="1" size="sm" color="neutral" active-color="primary" />
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- MODALS -->
    <DashboardComLogMetricExportModal 
      v-if="isExportModalOpen" 
      v-model:open="isExportModalOpen" 
      :export-type="activeView" 
    />

    <DashboardComLogCancelQueueModal
      v-if="isCancelModalOpen"
      v-model:open="isCancelModalOpen"
      :items="itemsToCancel"
      @confirmed="handleCancelConfirmed"
    />
  </div>
</template>

<style scoped>
.text-highlighted {
  color: var(--color-neutral-900);
}
.dark .text-highlighted {
  color: var(--color-neutral-100);
}
.text-dimmed {
  color: var(--color-neutral-500);
}
</style>


<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { breakpointsTailwind, useBreakpoints, useDebounceFn, useSessionStorage } from '@vueuse/core'

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: 'manage_mail',
  title: 'Webmailer'
})

const localePath = useLocalePath()
const notify = useNotify()
const isMobile = useBreakpoints(breakpointsTailwind).smaller('lg')

// ─── ACCOUNT SWITCHER ──────────────────────────────────────────────────────
// Chaque entrée correspond à un alias Mailgun inbound.
// `id` doit correspondre au champ `toAccount` dans la table mailbox.
const accounts = ref([
  { id: 'support',    label: 'support@support.techkne.com', icon: 'i-lucide:help-circle',   color: 'info'     },
  { id: 'contact',    label: 'contact@support.techkne.com', icon: 'i-lucide:mail',          color: 'primary'  },
  { id: 'moderation', label: 'moderation@support.techkne.com', icon: 'i-lucide:shield-check', color: 'warning'  },
])
const activeAccount = ref(accounts.value[1]) // Default to contact (index 1)

// ─── SIDEBAR NAVIGATION ────────────────────────────────────────────────────
const sidebarExpanded = useSessionStorage('webmailer-sidebar-expanded', true)
const systemFolders = [
  { id: 'inbox',   label: 'Boîte de réception', icon: 'i-lucide:inbox'    },
  { id: 'sent',    label: 'Envoyés',             icon: 'i-lucide:send'     },
  { id: 'draft',   label: 'Brouillons',          icon: 'i-lucide:file-text' },
  { id: 'starred', label: 'Favoris',             icon: 'i-lucide:star'     },
  { id: 'archive', label: 'Archives',            icon: 'i-lucide:archive'  },
  { id: 'spam',    label: 'Spam',                icon: 'i-lucide:shield-ban' },
  { id: 'trash',   label: 'Corbeille',           icon: 'i-lucide:trash-2'  },
]
const activeFolder = useSessionStorage('webmailer-active-folder', 'inbox')

// ─── TOP-BAR FILTERS ────────────────────────────────────────────────────────
const activeTab = useSessionStorage<'all'|'unread'|'pinned'|'important'>('webmailer-active-tab', 'all')
const sortBy = useSessionStorage<'date'|'size'>('webmailer-sort-by', 'date')
const sortOrder = useSessionStorage<'asc'|'desc'>('webmailer-sort-order', 'desc')
const search = ref('')
const debouncedSearch = ref('')
const threadMode = useSessionStorage('webmailer-thread-mode', false)
const showRulesModal = ref(false)
const scrollPosition = useSessionStorage('webmailer-scroll-pos', 0)
const scrollContainer = ref<HTMLElement | null>(null)

// Browser Notifications logic removed as requested
const requestNotificationPermission = async () => {
  // Logic removed for now
}


const debounceSearch = useDebounceFn(() => {
  debouncedSearch.value = search.value
  fetchMails()
}, 400)

watch(search, debounceSearch)

// ─── LAYOUT LIST (for composer) ───────────────────────────────────────────────
const { data: layoutsData } = await useFetch<any>('/api/mails/layouts', { lazy: true, default: () => ({ layouts: [] }) })
const contactLayouts = computed(() => {
  const all = layoutsData.value?.layouts || []
  return all.filter((l: any) => l.category === 'contact' || l.id === 'inbox')
    .map((l: any) => ({ label: l.name, value: l.id }))
})

// ─── MAIL DATA ───────────────────────────────────────────────────────────────
const mails = ref<any[]>([])

// Mark as read watcher or other logic can go here. 
// Notifications logic removed as requested.
const loadingMails = ref(false)

const fetchMails = async () => {
  loadingMails.value = true
  try {
    const params = new URLSearchParams({
      account: activeAccount.value.id,
      folder: activeFolder.value,
      tab: activeTab.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      threadMode: threadMode.value.toString(),
      ...(debouncedSearch.value ? { search: debouncedSearch.value } : {})
    })
    mails.value = await $fetch<any[]>(`/api/mails?${params}`) || []
  } catch (e) {
    mails.value = []
  } finally {
    loadingMails.value = false
  }
}

watch([activeAccount, activeFolder, activeTab, sortBy, sortOrder, threadMode], fetchMails, { immediate: false })
onMounted(fetchMails)

// ─── FOLDERS & LABELS ────────────────────────────────────────────────────────
const { data: foldersData, refresh: refreshFolders } = await useFetch<any>('/api/mails/folders', { lazy: true, default: () => ({ folders: [] }) })
const { data: labelsData, refresh: refreshLabels } = await useFetch<any>('/api/mails/labels', { lazy: true, default: () => ({ labels: [] }) })

const customFolders = computed(() => foldersData.value?.folders || [])
const labels = computed(() => labelsData.value?.labels || [])

// Logic handled by DashboardInboxSidebar component

// ─── RULES MANAGEMENT ──────────────────────────────────────────────────────
const { data: rules, refresh: refreshRules } = await useFetch<any[]>('/api/mails/rules', { lazy: true, default: () => [] })

const newRuleSender = ref('')
const newRuleFolder = ref('')
const editingRuleId = ref<string | null>(null)

const openRulesModal = (rule?: any) => {
  if (rule) {
    editingRuleId.value = rule.id
    newRuleSender.value = rule.senderEmail
    newRuleFolder.value = rule.targetFolderId
  } else {
    editingRuleId.value = null
    newRuleSender.value = ''
    newRuleFolder.value = ''
  }
  showRulesModal.value = true
}

const createRule = async () => {
  if (!newRuleSender.value || !newRuleFolder.value) return
  const action = editingRuleId.value ? 'update' : 'create'
  await $fetch('/api/mails/rules', {
    method: 'POST',
    body: { 
      action, 
      id: editingRuleId.value, 
      senderEmail: newRuleSender.value, 
      targetFolderId: newRuleFolder.value 
    }
  })
  newRuleSender.value = ''
  newRuleFolder.value = ''
  editingRuleId.value = null
  showRulesModal.value = false
  await refreshRules()
  fetchMails()
}

const deleteRule = async (ruleId: string) => {
  await $fetch('/api/mails/rules', { method: 'POST', body: { action: 'delete', ruleId } })
  await refreshRules()
}

// ─── SCROLL MANAGEMENT ─────────────────────────────────────────────────────
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  scrollPosition.value = target.scrollTop
}

onMounted(async () => {
  await fetchMails()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollPosition.value
  }
})

// ─── SELECTION & ACTIONS ─────────────────────────────────────────────────────
const selectedMailIds = ref<string[]>([])

const selectAll = () => {
  if (selectedMailIds.value.length === mails.value.length) {
    selectedMailIds.value = []
  } else {
    selectedMailIds.value = mails.value.map(m => m.id)
  }
}

const performAction = async (action: string, ids: string[], extra: any = {}) => {
  try {
    const res = await $fetch<any>('/api/mails/actions', {
      method: 'POST',
      body: { action, ids, ...extra }
    })
    if (res.success) {
      await fetchMails()
      if (['trash', 'archive', 'delete-forever'].includes(action)) {
        selectedMailIds.value = selectedMailIds.value.filter(id => !ids.includes(id))
      }
      notify.success('Action effectuée')
    }
  } catch (e: any) {
    notify.error('Erreur', e.message)
  }
}

const toggleAttribute = async (id: string, attribute: string) => {
  const mail = mails.value.find(m => m.id === id)
  if (!mail) return
  await performAction('toggle-attribute', [id], { attribute, value: !mail[attribute] })
}

// ─── COMPOSER & CLICKS ───────────────────────────────────────────────────────
const { openComposer } = useComposer()

const handleMailClick = (mail: any) => {
  if (mail.category === 'draft') {
    openComposer({
      mode: 'new_message',
      id: mail.id,
      to: mail.fromEmail, // In drafts, fromEmail is usually the 'To'
      cc: mail.cc,
      bcc: mail.bcc,
      subject: mail.subject,
      body: mail.body,
      layoutId: mail.layoutId,
      attachments: mail.attachments || []
    })
  } else {
    navigateTo(localePath(`/dashboard/com/webmailer/${mail.id}`))
  }
}

// ─── LABEL OPTIONS ──────────────────────────────────────────────────────────
const allFolders = computed(() => [
  { label: '-- Dossiers Système --', disabled: true },
  ...systemFolders.map(f => ({ label: f.label, value: f.id, icon: f.icon })),
  { label: '-- Mes Dossiers --', disabled: true },
  ...customFolders.value.map(f => ({ label: f.name, value: f.id, icon: 'i-lucide:folder' }))
])

const selectedTargetFolder = ref<any>(null)

const showSettingsModal = ref(false)
const activeSettingsTab = ref<'import-export' | 'blacklist'>('import-export')

// ─── SPAM CONFIRMATION ──────────────────────────────────────────────────────
const spamConfirmIds = ref<string[]>([])
const spamConfirmSenders = ref<string[]>([])
const showSpamConfirm = ref(false)

const triggerSpamAction = (ids: string[]) => {
  const selectedMails = mails.value.filter(m => ids.includes(m.id))
  spamConfirmSenders.value = [...new Set(selectedMails.map(m => m.fromEmail).filter(Boolean))] as string[]
  spamConfirmIds.value = ids
  showSpamConfirm.value = true
}

const onConfirmSpam = async (options: { blacklist: boolean }) => {
  await performAction('spam', spamConfirmIds.value, { blacklist: options.blacklist })
  selectedMailIds.value = selectedMailIds.value.filter(id => !spamConfirmIds.value.includes(id))
}

const exportLoading = ref(false)
const exportMails = async () => {
  if (selectedMailIds.value.length === 0) return
  exportLoading.value = true
  try {
    const blob = await $fetch<Blob>('/api/mails/export', {
      method: 'POST',
      body: { ids: selectedMailIds.value },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `export_mails_${Date.now()}.zip`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    notify.success('Exportation prête')
  } catch (e: any) {
    notify.error('Erreur export', e.message)
  } finally {
    exportLoading.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <UDashboardPanel id="webmailer" grow>
      <!-- TOP TOOLBAR -->
      <div class="border-b border-default bg-white dark:bg-neutral-900 px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
        <UButton icon="i-lucide:panel-left-close" variant="ghost" color="neutral" size="sm" class="lg:hidden" @click="sidebarExpanded = !sidebarExpanded" />
        <USelectMenu v-model="activeAccount" :items="accounts" placeholder="Boîte Mail" class="w-48" @update:model-value="activeFolder = 'inbox'">
          <template #leading>
            <UIcon :name="activeAccount?.icon || 'i-lucide:mail'" class="w-4 h-4 text-primary" />
          </template>
        </USelectMenu>
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 hidden sm:block" />
        <div class="flex-1 min-w-[200px] max-w-sm">
          <UInput v-model="search" icon="i-lucide:search" placeholder="Rechercher..." size="sm" :loading="loadingMails && !!search">
            <template v-if="search" #trailing>
              <UButton icon="i-lucide:x" size="xs" variant="ghost" color="neutral" @click="search = ''; debouncedSearch = ''; fetchMails()" />
            </template>
          </UInput>
        </div>
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1 hidden lg:block" />
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5" >
          <UButton label="Tous" :variant="activeTab === 'all' ? 'solid' : 'ghost'" :color="activeTab === 'all' ? 'primary' : 'neutral'" size="xs" class="rounded" @click="activeTab = 'all'" />
          <UButton label="Non lus" :variant="activeTab === 'unread' ? 'solid' : 'ghost'" :color="activeTab === 'unread' ? 'primary' : 'neutral'" size="xs" class="rounded" @click="activeTab = 'unread'" />
          <UButton icon="i-lucide:pin" :variant="activeTab === 'pinned' ? 'solid' : 'ghost'" :color="activeTab === 'pinned' ? 'primary' : 'neutral'" size="xs" class="rounded" @click="activeTab = 'pinned'" />
          <UButton icon="i-lucide:triangle-alert" :variant="activeTab === 'important' ? 'solid' : 'ghost'" :color="activeTab === 'important' ? 'primary' : 'neutral'" size="xs" class="rounded" @click="activeTab = 'important'" />
        </div>
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        <div class="flex items-center gap-0.5">
          <UDropdownMenu :items="[
            [
              { label: 'Tout sélectionner', icon: 'i-lucide:check-circle-2', onSelect: () => selectedMailIds = mails.map(m => m.id) },
              { label: 'Aucun', icon: 'i-lucide:circle', onSelect: () => selectedMailIds = [] }
            ],
            [
              { label: 'Non lus', icon: 'i-lucide:mail', onSelect: () => selectedMailIds = mails.filter(m => m.unread).map(m => m.id) },
              { label: 'Lus', icon: 'i-lucide:mail-open', onSelect: () => selectedMailIds = mails.filter(m => !m.unread).map(m => m.id) },
              { label: 'Importants', icon: 'i-lucide:triangle-alert', onSelect: () => selectedMailIds = mails.filter(m => m.important).map(m => m.id) }
            ]
          ]">
            <UButton icon="i-lucide:ellipsis-vertical" size="xs" variant="ghost" color="neutral" />
          </UDropdownMenu>
          <UCheckbox
            :model-value="selectedMailIds.length === mails.length && mails.length > 0"
            :indeterminate="selectedMailIds.length > 0 && selectedMailIds.length < mails.length"
            @update:model-value="(v) => v ? selectedMailIds = mails.map(m => m.id) : selectedMailIds = []"
          />
        </div>
        <div v-if="activeFolder === 'spam'" class="flex items-center gap-1">
          <UTooltip text="Gérer la liste noire">
            <UButton icon="i-lucide:user-x" color="error" variant="ghost" size="xs" @click="activeSettingsTab = 'blacklist'; showSettingsModal = true" />
          </UTooltip>
          <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        </div>
        <UTooltip text="Actualiser">
          <UButton
            icon="i-lucide:refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="loadingMails"
            @click="fetchMails"
          />
        </UTooltip>
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        <UDropdownMenu :items="[[ { label: 'Par date', icon: 'i-lucide:calendar', onSelect: () => sortBy = 'date', class: sortBy === 'date' ? 'font-bold text-primary' : '' }, { label: 'Par poids', icon: 'i-lucide:database', onSelect: () => sortBy = 'size', class: sortBy === 'size' ? 'font-bold text-primary' : '' } ]]">
          <UButton icon="i-lucide:arrow-up-down" :label="sortBy === 'date' ? 'Date' : 'Poids'" variant="ghost" color="neutral" size="xs" trailing-icon="i-lucide:chevron-down" />
        </UDropdownMenu>
        <UTooltip :text="sortBy === 'size' ? (sortOrder === 'desc' ? 'Taille décroissante' : 'Taille croissante') : (sortOrder === 'desc' ? 'Plus récent en premier' : 'Plus ancien en premier')">
          <UButton :icon="sortOrder === 'desc' ? 'i-lucide:sort-desc' : 'i-lucide:sort-asc'" variant="ghost" color="neutral" size="xs" @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'" />
        </UTooltip>
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        <UTooltip text="Mode Conversation">
          <UButton :icon="threadMode ? 'i-lucide:layers' : 'i-lucide:layers-2'" :color="threadMode ? 'primary' : 'neutral'" :variant="threadMode ? 'soft' : 'ghost'" size="xs" @click="threadMode = !threadMode" />
        </UTooltip>
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        <UTooltip text="Nouveau message">
          <UButton icon="i-lucide:edit" color="primary" variant="solid" size="sm" class="ml-2 rounded-full shadow-md" @click="openComposer({ mode: 'new_message', isCreation: true })" />
        </UTooltip>
      </div>

      <!-- MAIN CONTENT -->
      <div class="flex flex-1 overflow-hidden">
        <!-- SIDEBAR -->
        <ClientOnly>
          <template #fallback>
             <div class="w-14 lg:w-56 h-full flex flex-col items-center justify-center border-r border-default opacity-20">
               <UIcon name="i-lucide:refresh-cw" class="size-6 animate-spin" />
             </div>
          </template>
          <DashboardComWebmailerSidebar 
            v-model:active-folder="activeFolder"
            v-model:sidebar-expanded="sidebarExpanded"
            :system-folders="systemFolders"
            :custom-folders="customFolders"
            :labels="labels"
            :rules="rules"
            @refresh-folders="refreshFolders"
            @refresh-labels="refreshLabels"
            @open-rules-modal="openRulesModal"
            @delete-rule="deleteRule"
            @open-settings="activeSettingsTab = 'import-export'; showSettingsModal = true"
          />
        </ClientOnly>

        <!-- MAIL LIST -->
        <div class="w-full flex-1 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
          <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
            <div v-if="selectedMailIds.length > 0" class="flex items-center gap-1 p-2 bg-primary/5 dark:bg-primary/10 border-b border-primary/20 shrink-0 sticky top-0 z-10">
              <template v-if="activeFolder === 'trash'">
                <UButton icon="i-lucide:rotate-ccw" size="sm" variant="ghost" color="success" label="Restaurer" @click="performAction('restore', selectedMailIds)" />
                <UButton icon="i-lucide:trash-2" size="sm" variant="ghost" color="error" label="Supprimer" @click="performAction('delete-forever', selectedMailIds)" />
              </template>
              <template v-else>
                <UButton icon="i-lucide:archive" size="sm" variant="ghost" color="neutral" @click="performAction('archive', selectedMailIds)" />
                <UButton icon="i-lucide:trash-2" size="sm" variant="ghost" color="error" @click="performAction('trash', selectedMailIds)" />
                <UButton icon="i-lucide:shield-ban" size="sm" variant="ghost" color="warning" @click="triggerSpamAction(selectedMailIds)" />
                <div class="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
                <UButton icon="i-lucide:pin" size="xs" variant="ghost" color="neutral" @click="performAction('toggle-attribute', selectedMailIds, { attribute: 'pinned', value: true })" />
                <UDropdownMenu :items="labels.map(l => ({ label: l.name, icon: 'i-lucide:tag', onSelect: () => performAction('add-label', selectedMailIds, { labelId: l.id }) }))">
                   <UButton icon="i-lucide:tag" size="xs" variant="ghost" color="neutral" />
                </UDropdownMenu>
              </template>
              
              <div class="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
              <UButton icon="i-lucide:check-circle" size="xs" variant="ghost" color="neutral" label="Lu" @click="performAction('mark-read', selectedMailIds)" />
              <UButton icon="i-lucide:mail" size="xs" variant="ghost" color="neutral" label="Non lu" @click="performAction('mark-unread', selectedMailIds)" />
              <div class="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
              <UButton :loading="exportLoading" icon="i-lucide:download" size="xs" variant="ghost" color="neutral" label="Exporter (.eml)" @click="exportMails" />
              <div class="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
              <div class="flex items-center gap-1">
                <USelectMenu 
                  v-model="selectedTargetFolder" 
                  size="xs" 
                  placeholder="Destination..." 
                  :items="allFolders"
                  class="min-w-[150px]"
                >
                  <template #leading>
                    <UIcon :name="selectedTargetFolder?.icon || 'i-lucide:folder-output'" class="size-3" />
                  </template>
                </USelectMenu>
                <UButton label="Déplacer" size="xs" color="primary" icon="i-lucide:check" :disabled="!selectedTargetFolder" @click="performAction('move-to-folder', selectedMailIds, { folderId: selectedTargetFolder.value })" />
              </div>
              <div class="flex-1" />
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-black px-2 text-primary uppercase tracking-tighter">{{ selectedMailIds.length }} sélectionné(s)</span>
                <UButton icon="i-lucide:x" size="xs" variant="ghost" color="neutral" @click="selectedMailIds = []" />
              </div>
            </div>
          </Transition>

          <div ref="scrollContainer" class="flex-1 overflow-y-auto divide-y divide-default scroll-smooth" @scroll="handleScroll">
            <div v-if="loadingMails && mails.length === 0" class="flex flex-col items-center justify-center p-8 opacity-40 min-h-[50vh]">
              <UIcon name="i-lucide:refresh-cw" class="size-6 animate-spin" />
            </div>
            <div v-else-if="!loadingMails && mails.length === 0" class="flex flex-col items-center justify-center p-8 opacity-30 text-center min-h-[50vh]">
              <UIcon name="i-lucide:inbox" class="size-16 mb-4" />
              <span class="text-lg font-bold">Aucun message</span>
            </div>
            <div v-for="mail in mails" :key="mail.id" class="p-3 px-4 text-sm cursor-pointer border-l-2 transition-colors relative group/item" :class="[mail.unread ? 'text-highlighted border-primary' : 'text-toned border-transparent hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50', selectedMailIds.includes(mail.id) ? 'bg-primary/5' : '']" @click="handleMailClick(mail)">
              <div class="flex items-center gap-2.5 mb-1">
                <UCheckbox :model-value="selectedMailIds.includes(mail.id)" size="sm" class="transition-opacity" :class="[selectedMailIds.includes(mail.id) ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100']" @update:model-value="(v) => { if (v) selectedMailIds.push(mail.id); else selectedMailIds.splice(selectedMailIds.indexOf(mail.id), 1) }" @click.stop />
                <div class="flex-1 flex items-center justify-between gap-1 min-w-0">
                  <span class="truncate text-xs" :class="mail.unread ? 'font-bold' : 'font-medium'">{{ mail.fromName || mail.fromEmail || 'Inconnu' }}</span>
                  <span class="shrink-0 text-[10px] text-dimmed font-mono">{{ new Date(mail.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2.5 pl-6 group/info">
                <div class="flex-1 min-w-0">
                  <p class="truncate text-xs font-bold flex items-center gap-2">
                    <UIcon v-if="mail.pinned" name="i-lucide:pin" class="size-3 text-primary shrink-0" />
                    {{ mail.subject || '(Sans objet)' }}
                    <UBadge v-if="mail.isThread && mail.threadCount > 1" size="xs" variant="soft" color="neutral" class="rounded-full px-1.5">{{ mail.threadCount }}</UBadge>
                  </p>
                  <p class="text-[11px] text-dimmed truncate mt-0.5">{{ mail.body?.replace(/<[^>]+>/g, '').substring(0, 80) }}</p>
                </div>
                <UIcon :name="mail.starred ? 'i-lucide:star' : 'i-lucide:star'" class="size-3 shrink-0 transition-opacity" :class="mail.starred ? 'text-yellow-400 fill-yellow-400/40 opacity-100' : 'text-neutral-300 opacity-0 group-hover/item:opacity-100'" @click.stop="toggleAttribute(mail.id, 'starred')" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RULES MODAL -->
      <UModal v-model:open="showRulesModal" title="Filtres Automatiques" description="Rangez automatiquement vos e-mails par expéditeur.">
        <template #content>
          <div class="p-4 space-y-6">
            <div class="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-default space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-dimmed flex items-center gap-2">
                <UIcon name="i-lucide:plus" class="size-3.5" />
                Nouvelle règle
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UFormField label="Email de l'expéditeur" size="sm">
                   <UInput v-model="newRuleSender" placeholder="exemple@test.com" block />
                </UFormField>
                <UFormField label="Dossier cible" size="sm">
                  <USelectMenu v-model="newRuleFolder" :items="customFolders.map(f => ({ label: f.name, value: f.id }))" value-attribute="value" placeholder="Choisir..." block />
                </UFormField>
              </div>
              <UButton :label="editingRuleId ? 'Modifier la règle' : 'Créer la règle'" color="primary" block icon="i-lucide:check" @click="createRule" />
            </div>

            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-dimmed">Règles actives</h4>
              <div v-if="rules.length === 0" class="text-center py-8 opacity-40 text-xs italic">Aucune règle définie.</div>
              <div v-for="rule in rules" :key="rule.id" class="flex items-center justify-between p-3 rounded-lg border border-default bg-white dark:bg-neutral-900 shadow-sm transition-all hover:shadow-md">
                <div class="min-w-0">
                  <p class="text-xs font-bold truncate">{{ rule.senderEmail }}</p>
                  <p class="text-[10px] text-dimmed flex items-center gap-1">
                    <UIcon name="i-lucide:arrow-right" class="size-3" />
                    {{ customFolders.find(f => f.id === rule.targetFolderId)?.name || 'Dossier inconnu' }}
                  </p>
                </div>
                <UButton icon="i-lucide:trash-2" size="xs" variant="ghost" color="error" @click="deleteRule(rule.id)" />
              </div>
            </div>
          </div>
        </template>
      </UModal>

      <!-- COMPOSER MODAL (REMOVED - GLOBAL) -->

      <!-- SETTINGS MODAL -->
      <DashboardComWebmailerSettingsModal 
        v-model:open="showSettingsModal" 
        :folders="customFolders"
        :system-folders="systemFolders"
        :default-tab="activeSettingsTab"
        @refresh="() => { fetchMails(); refreshFolders(); }"
      />

      <!-- SPAM CONFIRMATION CARD -->
      <DashboardComWebmailerSpamConfirmationCard 
        v-if="showSpamConfirm"
        :ids="spamConfirmIds"
        :senders="spamConfirmSenders"
        @confirm="onConfirmSpam"
        @cancel="showSpamConfirm = false"
      />
    </UDashboardPanel>
  </div>
</template>

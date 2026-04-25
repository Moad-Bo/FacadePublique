<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue'
import { useSessionStorage } from '@vueuse/core'

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: 'manage_mail',
  title: 'Message',
  pageTransition: {
    name: 'page',
    mode: 'out-in'
  }
})

const route = useRoute()
const router = useRouter()
const notify = useNotify()
const localePath = useLocalePath()

const mailId = computed(() => route.params.id as string)
const { openComposer } = useComposer()
const selectedThreadIds = ref<string[]>([])
const threadMode = useSessionStorage('webmailer-thread-mode', false)

// Thread sorting & filtering
const sortThreadBy = ref<'date' | 'size'>('date')
const sortThreadOrder = ref<'asc' | 'desc'>('desc')
const searchInThread = ref('')

const { data: mailInfo, pending, refresh } = await useFetch<any>(`/api/mails/${mailId.value}`, {
  lazy: true
})

const { data: layoutsData } = await useFetch<any>('/api/mails/layouts', { lazy: true, default: () => ({ layouts: [] }) })
const contactLayouts = computed(() => {
  const all = layoutsData.value?.layouts || []
  return all.filter((l: any) => l.category === 'contact' || l.id === 'inbox')
    .map((l: any) => ({ label: l.name, value: l.id }))
})

const mail = computed(() => mailInfo.value?.mail)

const sortedThread = computed(() => {
  if (!mail.value?.thread) return []
  
  let list = [...mail.value.thread]
  
  // Filter by search
  if (searchInThread.value.trim()) {
    const q = searchInThread.value.toLowerCase()
    list = list.filter(m => 
      m.subject?.toLowerCase().includes(q) || 
      m.body?.toLowerCase().includes(q) || 
      m.fromEmail?.toLowerCase().includes(q) ||
      m.fromName?.toLowerCase().includes(q)
    )
  }
  
  // Sort
  list.sort((a, b) => {
    // 1. Priority to pinned messages
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1

    // 2. Normal sort by chosen criteria
    let valA = sortThreadBy.value === 'date' ? new Date(a.date).getTime() : (a.size || 0)
    let valB = sortThreadBy.value === 'date' ? new Date(b.date).getTime() : (b.size || 0)
    
    if (sortThreadOrder.value === 'desc') return valB - valA
    return valA - valB
  })
  
  return list
})

const goBack = () => {
  router.back()
}

const performAction = async (action: string, ids: string[] = [mailId.value], extra: any = {}) => {
  try {
    const res = await $fetch<any>('/api/mails/actions', {
      method: 'POST',
      body: { action, ids, ...extra }
    })
    if (res.success) {
      notify.success('Action effectuée')
      if (['trash', 'archive', 'delete-forever', 'spam'].includes(action)) {
        // If we processed the main mail of this page or all mails in thread, go back
        if (ids.includes(mailId.value)) {
           goBack()
        } else {
           refresh()
        }
      } else {
        refresh()
      }
      
      // Clear selection after bulk
      if (ids.length > 1) selectedThreadIds.value = []
    }
  } catch (e: any) {
    notify.error('Erreur', e.message)
  }
}

const toggleAttribute = async (attribute: string) => {
  if (!mail.value) return
  try {
    await $fetch<any>('/api/mails/actions', {
      method: 'POST',
      body: { action: 'toggle-attribute', ids: [mailId.value], attribute, value: !mail.value[attribute] }
    })
    refresh()
  } catch (e: any) {
    notify.error('Erreur', e.message)
  }
}

const openReply = (isForward = false) => {
  if (!mail.value) return
  
  if (isForward) {
    const dateStr = new Date(mail.value.date).toLocaleString('fr-FR', { 
      day: '2-digit', month: 'long', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    })
    
    const forwardHeader = `\n\n---------- Message transféré ----------\n` +
      `De : ${mail.value.fromName || ''} <${mail.value.fromEmail || ''}>\n` +
      `Date : ${dateStr}\n` +
      `Objet : ${mail.value.subject || ''}\n` +
      `À : ${mail.value.toAccount || 'contact'}@mail.techkne.fr\n\n`
      
    const forwardBody = forwardHeader + (mail.value.body || '')
    
    openComposer({
      mode: 'new_message',
      subject: `Fwd: ${mail.value.subject || ''}`,
      body: forwardBody,
      attachments: mail.value.attachments || [],
    })
  } else {
    const replyHeader = `\n\n--- En réponse à ---\n`
    const replyBody = replyHeader + (mail.value.body || '')
    
    openComposer({
      mode: 'new_message',
      to: mail.value.fromEmail || '',
      subject: `Re: ${mail.value.subject || ''}`,
      body: replyBody,
      isReply: true,
    })
  }
}

const openEdit = () => {
  if (!mail.value) return
  openComposer({
    mode: 'new_message',
    id: mail.value.id,
    to: mail.value.fromEmail,
    cc: mail.value.cc,
    bcc: mail.value.bcc,
    subject: mail.value.subject,
    body: mail.value.body,
    layoutId: mail.value.layoutId,
    attachments: mail.value.attachments || []
  })
}

// Mark as read when opened
watch(mail, (newMail) => {
  if (newMail && newMail.unread && newMail.category !== 'draft') {
    performAction('mark-read')
  }
}, { immediate: true })

const onComposerSuccess = (result: any) => {
  refresh()
  if (result.type === 'send') {
    // If it was a draft and we sent it, maybe go back or just refresh
    if (mail.value?.category === 'draft') {
        navigateTo(localePath('/dashboard/com/webmailer'))
    }
  }
}

const exportMails = async (ids: string[]) => {
  if (ids.length === 0) return
  try {
    const blob = await $fetch<Blob>('/api/mails/export', {
      method: 'POST',
      body: { ids },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', ids.length > 1 ? `thread_${mailId.value}.zip` : `${ids[0]}.eml`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    notify.success('Exportation prête')
  } catch (e: any) {
    notify.error('Erreur export', e.message)
  }
}
// ─── SPAM CONFIRMATION ──────────────────────────────────────────────────────
const spamConfirmIds = ref<string[]>([])
const spamConfirmSenders = ref<string[]>([])
const showSpamConfirm = ref(false)

const triggerSpamAction = (ids: string[]) => {
  // If thread mode, we find mails in sortedThread
  const targetMails = mail.value?.thread?.filter((m: any) => ids.includes(m.id)) || [mail.value]
  spamConfirmSenders.value = [...new Set(targetMails.map((m: any) => m.fromEmail).filter(Boolean))] as string[]
  spamConfirmIds.value = ids
  showSpamConfirm.value = true
}

const onConfirmSpam = async (options: { blacklist: boolean }) => {
  await performAction('spam', spamConfirmIds.value, { blacklist: options.blacklist })
}

</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <UDashboardPanel grow>
      <div class="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950/20 flex flex-col">
        <div v-if="pending" class="flex flex-col items-center justify-center p-12 opacity-50 h-[50vh]">
          <UIcon name="i-lucide:loader-2" class="size-8 animate-spin text-primary mb-4" />
          <span class="font-medium">Chargement du message...</span>
        </div>

        <div v-else-if="!mail" class="flex flex-col items-center justify-center p-12 text-center opacity-40 h-[50vh]">
          <UIcon name="i-lucide:mail-x" class="size-20 mb-3" />
          <p class="font-bold text-lg">Message introuvable</p>
          <UButton label="Retourner à la boîte de réception" color="primary" variant="soft" class="mt-4" @click="goBack" />
        </div>

        <div v-else class="h-full flex flex-col overflow-hidden">
          <!-- Conversation / Thread View -->
          <div v-if="threadMode && mail.thread?.length > 1" class="h-full flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
            <!-- Unified Header Toolbar for Threads -->
            <div class="flex items-center justify-between p-2 px-4 border-b border-default bg-white dark:bg-neutral-900 shrink-0 sticky top-0 z-20 min-h-[48px]">
              <div class="flex items-center gap-2">
                <UButton icon="i-lucide:arrow-left" variant="ghost" color="neutral" size="sm" class="-ms-1" @click="goBack" />
                <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
                
                <!-- Selection & Filters -->
                <div class="flex items-center gap-0.5">
                  <UDropdownMenu :items="[
                    [
                      { label: 'Tout sélectionner', icon: 'i-lucide:check-circle-2', onSelect: () => selectedThreadIds = mail.thread.map(m => m.id) },
                      { label: 'Aucun', icon: 'i-lucide:circle', onSelect: () => selectedThreadIds = [] }
                    ],
                    [
                      { label: 'Lus', icon: 'i-lucide:mail-open', onSelect: () => selectedThreadIds = mail.thread.filter(m => !m.unread).map(m => m.id) },
                      { label: 'Non lus', icon: 'i-lucide:mail', onSelect: () => selectedThreadIds = mail.thread.filter(m => m.unread).map(m => m.id) },
                      { label: 'Importants', icon: 'i-lucide:triangle-alert', onSelect: () => selectedThreadIds = mail.thread.filter(m => m.important).map(m => m.id) }
                    ]
                  ]">
                    <UButton icon="i-lucide:ellipsis-vertical" size="xs" variant="ghost" color="neutral" />
                  </UDropdownMenu>
                  <UCheckbox 
                    :model-value="selectedThreadIds.length === mail.thread.length && mail.thread.length > 0"
                    :indeterminate="selectedThreadIds.length > 0 && selectedThreadIds.length < mail.thread.length"
                    class="size-4"
                    @update:model-value="(v) => v ? selectedThreadIds = mail.thread.map(m => m.id) : selectedThreadIds = []"
                  />
                  <span v-if="selectedThreadIds.length > 0" class="text-[10px] font-black uppercase text-primary px-1">{{ selectedThreadIds.length }}</span>
                </div>
              </div>

              <!-- Thread Bulk Actions -->
              <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
                <div v-if="selectedThreadIds.length > 0" class="flex items-center gap-1 bg-primary/5 p-1 px-2 rounded-lg border border-primary/20">
                  <UButton icon="i-lucide:check-circle" size="xs" variant="ghost" color="neutral" @click="performAction('toggle-attribute', selectedThreadIds, { attribute: 'unread', value: false })" />
                  <UButton icon="i-lucide:mail" size="xs" variant="ghost" color="neutral" @click="performAction('toggle-attribute', selectedThreadIds, { attribute: 'unread', value: true })" />
                  <div class="w-px h-3 bg-primary/20 mx-1" />
                  <UButton icon="i-lucide:archive" size="xs" variant="ghost" color="neutral" @click="performAction('archive', selectedThreadIds)" />
                  <UButton icon="i-lucide:download" size="xs" variant="ghost" color="neutral" @click="exportMails(selectedThreadIds)" />
                  <UButton icon="i-lucide:shield-ban" size="xs" variant="ghost" color="warning" @click="triggerSpamAction(selectedThreadIds)" />
                  <UButton icon="i-lucide:trash-2" size="xs" variant="ghost" color="error" @click="performAction('trash', selectedThreadIds)" />
                </div>
              </Transition>

              <div class="flex items-center gap-1">
                <UInput v-model="searchInThread" icon="i-lucide:search" placeholder="Rechercher..." size="xs" class="w-40" />
                <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
                
                <UDropdownMenu :items="[[ 
                  { label: 'Par date', icon: 'i-lucide:calendar', onSelect: () => sortThreadBy = 'date', class: sortThreadBy === 'date' ? 'font-bold text-primary' : '' }, 
                  { label: 'Par poids', icon: 'i-lucide:database', onSelect: () => sortThreadBy = 'size', class: sortThreadBy === 'size' ? 'font-bold text-primary' : '' } 
                ]]">
                  <UButton icon="i-lucide:arrow-up-down" :label="sortThreadBy === 'date' ? 'Date' : 'Poids'" variant="ghost" color="neutral" size="xs" trailing-icon="i-lucide:chevron-down" />
                </UDropdownMenu>
                
                <UTooltip :text="sortThreadBy === 'size' ? (sortThreadOrder === 'desc' ? 'Taille décroissante' : 'Taille croissante') : (sortThreadOrder === 'desc' ? 'Plus récent' : 'Plus ancien')">
                  <UButton :icon="sortThreadOrder === 'desc' ? 'i-lucide:sort-desc' : 'i-lucide:sort-asc'" variant="ghost" color="neutral" size="xs" @click="sortThreadOrder = sortThreadOrder === 'desc' ? 'asc' : 'desc'" />
                </UTooltip>

                <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

                <UTooltip text="Répondre au dernier">
                  <UButton icon="i-lucide:reply" variant="soft" color="primary" size="sm" @click="openReply(false)" />
                </UTooltip>
                <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
                <UTooltip text="Exporter la discussion">
                  <UButton icon="i-lucide:download" variant="ghost" color="neutral" size="sm" @click="exportMails(mail.thread.map(m => m.id))" />
                </UTooltip>
              </div>
            </div>

            <div class="flex-1 overflow-auto p-4 space-y-4 pb-20">
              <div v-for="tmail in sortedThread" :key="tmail.id" class="relative group/card transition-all rounded-2xl border-2 flex flex-col bg-white dark:bg-neutral-900 shadow-sm overflow-hidden" :class="[tmail.id === mailId ? 'border-primary shadow-md' : 'border-transparent opacity-90 hover:opacity-100 hover:border-neutral-200 dark:hover:border-neutral-800', selectedThreadIds.includes(tmail.id) ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-950' : '']">
                
                <!-- Card Header with Checkbox & Menu -->
                <div class="p-3 px-4 border-b border-default flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-800/20">
                  <div class="flex items-center gap-3">
                    <UCheckbox 
                      :model-value="selectedThreadIds.includes(tmail.id)" 
                      size="sm"
                      class="transition-opacity opacity-0 group-hover/card:opacity-100"
                      :class="{'opacity-100': selectedThreadIds.includes(tmail.id)}"
                      @update:model-value="(v) => v ? selectedThreadIds.push(tmail.id) : selectedThreadIds = selectedThreadIds.filter(id => id !== tmail.id)" 
                      @click.stop 
                    />
                    <UAvatar :alt="tmail.from?.name || tmail.fromName" size="sm" />
                    <div class="min-w-0">
                      <p class="text-xs font-bold truncate">{{ tmail.from?.name || tmail.fromName }}</p>
                      <p class="text-[10px] text-dimmed leading-none">{{ tmail.from?.email || tmail.fromEmail }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-dimmed font-mono">{{ new Date(tmail.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</span>
                    <UTooltip :text="tmail.pinned ? 'Désépingler' : 'Épingler'">
                      <UButton 
                        :icon="tmail.pinned ? 'i-lucide:pin-off' : 'i-lucide:pin'" 
                        size="xs" 
                        variant="ghost" 
                        :color="tmail.pinned ? 'primary' : 'neutral'" 
                        @click="performAction('toggle-attribute', [tmail.id], { attribute: 'pinned', value: !tmail.pinned })" 
                      />
                    </UTooltip>

                    <UDropdownMenu :items="[
                      [
                        { label: tmail.unread ? 'Marquer lu' : 'Marquer non lu', icon: tmail.unread ? 'i-lucide:check-circle-2' : 'i-lucide:check-circle', onSelect: () => performAction('toggle-attribute', [tmail.id], { attribute: 'unread', value: !tmail.unread }) },
                        { label: tmail.starred ? 'Retirer favori' : 'Favori', icon: 'i-lucide:star', onSelect: () => performAction('toggle-attribute', [tmail.id], { attribute: 'starred', value: !tmail.starred }) },
                        { label: 'Exporter (.eml)', icon: 'i-lucide:download', onSelect: () => exportMails([tmail.id]) }
                      ],
                      [
                        { label: 'Répondre', icon: 'i-lucide:reply', onSelect: () => openReply(false) },
                        { label: 'Transférer', icon: 'i-lucide:arrow-right', onSelect: () => openReply(true) },
                      ],
                      [
                        { label: 'Signaler Spam', icon: 'i-lucide:shield-ban', color: 'warning' as const, onSelect: () => triggerSpamAction([tmail.id]) },
                        { label: 'Supprimer', icon: 'i-lucide:trash-2', color: 'error' as const, onSelect: () => performAction('trash', [tmail.id]) }
                      ]
                    ]">
                      <UButton icon="i-lucide:ellipsis-vertical" size="xs" variant="ghost" color="neutral" />
                    </UDropdownMenu>
                  </div>
                </div>

                <div class="p-6">
                  <DashboardComWebmailerHtmlRenderer
                    :body="tmail.body"
                    :is-html="tmail.isHtml ?? false"
                    :max-height="600"
                  />
                </div>

                <!-- Thread Attachments (Text-on-card style) -->
                <div v-if="tmail.attachments?.length" class="px-6 pb-6 pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-default/50">
                  <div class="flex flex-wrap gap-2">
                    <a 
                      v-for="att in tmail.attachments" 
                      :key="att.id" 
                      :href="att.url" 
                      target="_blank"
                      class="flex items-center gap-2 p-1.5 px-3 rounded-full border border-default bg-neutral-50/50 dark:bg-neutral-900/50 text-[10px] font-bold group/att hover:bg-white dark:hover:bg-neutral-800 transition-all"
                    >
                      <UIcon :name="att.mimeType?.includes('image') ? 'i-lucide:image' : 'i-lucide:file-text'" class="size-3 text-dimmed group-hover/att:text-primary transition-colors" />
                      <span class="truncate max-w-[120px]">{{ att.filename }}</span>
                      <span class="text-[9px] text-dimmed">({{ (att.size / 1024).toFixed(0) }} KB)</span>
                      <UIcon name="i-lucide:download" class="size-3 text-dimmed opacity-0 group-hover/att:opacity-100 transition-opacity" />
                    </a>
                  </div>

                  <UButton 
                    v-if="tmail.attachments.length > 1"
                    label="Tout (ZIP)" 
                    icon="i-lucide:archive" 
                    variant="ghost" 
                    color="neutral" 
                    size="xs" 
                    class="font-black text-[9px] uppercase tracking-widest"
                  />
                </div>
              </div>

              <div class="mt-8 flex justify-center">
                <UButton icon="i-lucide:reply" label="Répondre à cette conversation" color="primary" variant="subtle" class="rounded-full px-6 shadow-sm" @click="openReply(false)" />
              </div>
            </div>
          </div>

          <!-- Single Mail View (Fallback) -->
          <DashboardComWebmailerMail
            v-else
            :mail="mail"
            @reply="openReply"
            @edit="openEdit"
            @action="(a: string) => performAction(a)"
            @toggle-attribute="(a: string) => toggleAttribute(a)"
            @close="goBack"
          />
        </div>
      </div>

      <!-- COMPOSER MODAL (REMOVED - GLOBAL) -->

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

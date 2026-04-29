<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  title: 'Centre de Campagne',
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: ['manage_campaign']
})

const { aliases, fetchSettings } = useCampaigns()
const notify = useNotify()

const activeSection = ref('campaigns')
const loading = ref(false)
const campaigns = ref<any[]>([])
const templates = ref<any[]>([])
const audience = ref<any[]>([])

// Navigation
const navigation = [
  { label: 'Campagnes', icon: 'i-lucide:send', value: 'campaigns' },
  { label: 'Modèles', icon: 'i-lucide:layout', value: 'templates' },
  { label: 'Audience', icon: 'i-lucide:users', value: 'audience' }
]

// Stats (reliées aux vraies données une fois chargées)
const stats = computed(() => [
  { label: 'Total Campagnes', value: campaigns.value.length.toString(), icon: 'i-lucide:mail', color: 'primary' },
  { label: 'Envoyées', value: campaigns.value.filter(c => c.status === 'sent').length.toString(), icon: 'i-lucide:check-circle', color: 'success' },
  { label: 'Planifiées', value: campaigns.value.filter(c => c.status === 'scheduled').length.toString(), icon: 'i-lucide:calendar-clock', color: 'info' },
  { label: 'Abonnés actifs', value: audience.value.filter(s => s.isActive).length.toString(), icon: 'i-lucide:users', color: 'warning' },
])

// --- Fetch ---
const fetchData = async () => {
    loading.value = true
    try {
        const [cRes, tRes, aRes] = await Promise.all([
            $fetch<any>('/api/campaign/campaigns'),
            $fetch<any>('/api/campaign/templates'),
            $fetch<any[]>('/api/campaign/audience')
        ])
        if (cRes.success) campaigns.value = cRes.campaigns
        if (tRes.success) templates.value = tRes.templates
        audience.value = Array.isArray(aRes) ? aRes : []
    } catch (e: any) {
        notify.error('Erreur de chargement', e.message)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchData()
    fetchSettings()
})

// --- Campaign ---
const deleteCampaign = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    try {
        await $fetch(`/api/campaign/campaigns?id=${id}`, { method: 'DELETE' })
        notify.success('Supprimé')
        fetchData()
    } catch (e) {
        notify.error('Erreur suppression')
    }
}

const campaignStatusColor = (status: string) => ({
    'sent': 'success', 'draft': 'neutral', 'scheduled': 'info',
    'sending': 'warning', 'archived': 'neutral'
}[status] || 'neutral')

const campaignTypeConf = (id: string) => CAMPAIGN_TYPES.find(t => t.id === id)

// --- Audience ---
const audienceFilter = ref<'all' | 'campaign_newsletter' | 'campaign_changelog' | 'campaign_promo'>('all')
const audienceSearch = ref('')

const audienceContextOptions = [
    { label: 'Tous', value: 'all', icon: 'i-lucide:users', count: computed(() => audience.value.filter(s => s.isActive).length) },
    { label: 'Newsletter', value: 'campaign_newsletter', icon: 'i-lucide:mail', count: computed(() => audience.value.filter(s => s.optInNewsletter && s.isActive).length) },
    { label: 'Changelog', value: 'campaign_changelog', icon: 'i-lucide:git-commit-horizontal', count: computed(() => audience.value.filter(s => s.optInChangelog && s.isActive).length) },
    { label: 'Promo', value: 'campaign_promo', icon: 'i-lucide:tag', count: computed(() => audience.value.filter(s => s.optInMarketing && s.isActive).length) },
]

const filteredAudience = computed(() => {
    let list = audience.value
    // Filtre par contexte
    if (audienceFilter.value === 'campaign_newsletter') list = list.filter(s => s.optInNewsletter)
    else if (audienceFilter.value === 'campaign_changelog') list = list.filter(s => s.optInChangelog)
    else if (audienceFilter.value === 'campaign_promo') list = list.filter(s => s.optInMarketing)
    // Recherche email
    if (audienceSearch.value) list = list.filter(s => s.email.toLowerCase().includes(audienceSearch.value.toLowerCase()))
    return list
})

const updatingOptIn = ref<string | null>(null)
const toggleOptIn = async (sub: any, field: 'optInNewsletter' | 'optInMarketing' | 'optInChangelog') => {
    updatingOptIn.value = `${sub.id}-${field}`
    try {
        await $fetch('/api/campaign/audience', {
            method: 'PATCH',
            body: { id: sub.id, [field]: !sub[field] }
        })
        sub[field] = !sub[field]
        notify.success('Préférence mise à jour')
    } catch (e: any) {
        notify.error('Erreur', e.message)
    } finally {
        updatingOptIn.value = null
    }
}

const exportAudience = () => {
    const list = filteredAudience.value
    const headers = ['Email', 'Newsletter', 'Changelog', 'Promo', 'Source', 'Actif', 'Inscription']
    const rows = list.map(s => [
        s.email,
        s.optInNewsletter ? 'Oui' : 'Non',
        s.optInChangelog ? 'Oui' : 'Non',
        s.optInMarketing ? 'Oui' : 'Non',
        s.source || 'landing',
        s.isActive ? 'Oui' : 'Non',
        new Date(s.createdAt).toLocaleDateString('fr-FR')
    ])
    downloadCSV(headers, rows, `audience-${audienceFilter.value}`)
}

// --- Multi-Selection & Advanced Actions ---
const selectedItems = ref<string[]>([])

const toggleSelection = (id: string) => {
  if (selectedItems.value.includes(id)) {
    selectedItems.value = selectedItems.value.filter(i => i !== id)
  } else {
    selectedItems.value.push(id)
  }
}

const selectAll = (list: any[]) => {
  if (selectedItems.value.length === list.length) {
    selectedItems.value = []
  } else {
    selectedItems.value = list.map(i => i.id)
  }
}

const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify.success('Export CSV généré')
}


// Reset selection on tab change
watch(activeSection, () => {
  selectedItems.value = []
})
</script>

<template>
  <UDashboardPanel grow>
    <div class="flex h-full overflow-hidden">
      
      <!-- LEFT SIDEBAR -->
      <aside class="w-64 border-r border-default bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col shrink-0">
        <div class="p-4 border-b border-default">
          <h3 class="font-black text-xs uppercase tracking-widest text-dimmed">Campagnes Studio</h3>
        </div>
        
        <nav class="flex-1 p-2 space-y-1">
          <UButton 
            v-for="item in navigation" 
            :key="item.value"
            :icon="item.icon"
            :label="item.label"
            :color="activeSection === item.value ? 'primary' : 'neutral'"
            :variant="activeSection === item.value ? 'soft' : 'ghost'"
            block
            class="justify-start font-bold"
            @click="activeSection = item.value"
          />
        </nav>
        
        <div class="p-4 border-t border-default bg-neutral-50/50 dark:bg-neutral-900/20">
          <p class="text-[10px] font-black uppercase text-dimmed mb-2">Expéditeurs</p>
          <div class="flex flex-col gap-1.5">
            <div v-for="alias in aliases.slice(0,3)" :key="alias.email" class="flex items-center gap-2">
              <div class="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide:at-sign" class="size-2.5 text-primary" />
              </div>
              <div class="min-w-0">
                <span class="text-[10px] font-bold text-toned truncate block">{{ alias.label }}</span>
                <span class="text-[9px] text-primary truncate italic block">{{ alias.email }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 overflow-y-auto bg-neutral-50/50 dark:bg-neutral-950/20">
        
        <!-- STATS -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-default">
          <UCard v-for="stat in stats" :key="stat.label" :ui="{ body: 'p-4' }" class="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
            <div class="flex items-center gap-3">
              <div :class="`size-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`">
                <UIcon :name="stat.icon" :class="`size-5 text-${stat.color}-500`" />
              </div>
              <div>
                <p class="text-[10px] text-dimmed uppercase font-black tracking-widest">{{ stat.label }}</p>
                <p class="text-xl font-black italic">{{ stat.value }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <div class="p-6 max-w-7xl mx-auto space-y-8">
            
            <!-- ═══ SECTION: CAMPAGNES ═══ -->
            <div v-if="activeSection === 'campaigns'" class="space-y-6">
                <h3 class="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <UIcon name="i-lucide:send" class="size-4 text-primary" />
                  Campagnes
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- NEW CAMPAIGN CARD — Simple CTA, choix du type déplacé dans le stepper -->
                    <NuxtLink to="/dashboard/com/campagne/nouvelle">
                      <UCard class="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer group h-full">
                        <div class="flex flex-col items-center justify-center gap-4 py-6 h-full text-center">
                          <div class="size-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all group-hover:scale-110 duration-300">
                            <UIcon name="i-lucide:plus" class="size-7 text-primary" />
                          </div>
                          <div>
                            <h4 class="font-black text-sm uppercase tracking-widest text-primary">Nouvelle Campagne</h4>
                            <p class="text-xs text-dimmed mt-1 font-medium">Newsletter, Changelog ou Promo</p>
                          </div>
                          <UIcon name="i-lucide:arrow-right" class="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 duration-300" />
                        </div>
                      </UCard>
                    </NuxtLink>

                    <!-- CAMPAIGN CARDS -->
                    <UCard v-for="camp in campaigns" :key="camp.id" class="group hover:ring-2 hover:ring-primary/20 transition-all">
                        <div class="flex flex-col gap-4">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-2">
                                  <div v-if="campaignTypeConf(camp.fromContext)" :class="`size-7 rounded-lg bg-${campaignTypeConf(camp.fromContext)?.color}-500/10 flex items-center justify-center`">
                                    <UIcon :name="campaignTypeConf(camp.fromContext)?.icon || 'i-lucide:mail'" :class="`size-3.5 text-${campaignTypeConf(camp.fromContext)?.color}-500`" />
                                  </div>
                                  <UBadge
                                    :label="campaignTypeConf(camp.fromContext)?.label || camp.type?.toUpperCase() || 'EMAIL'"
                                    size="xs"
                                    variant="soft"
                                    :color="(campaignTypeConf(camp.fromContext)?.color as any) || 'primary'"
                                    class="font-black text-[9px]"
                                  />
                                </div>
                                <div class="flex items-center gap-1">
                                   <UBadge :label="camp.status?.toUpperCase()" size="xs" variant="outline" :color="(campaignStatusColor(camp.status) as any)" class="text-[8px] px-1 py-0" />
                                   <UButton icon="i-lucide:trash-2" variant="ghost" color="error" size="sm" class="opacity-0 group-hover:opacity-100" @click.prevent="deleteCampaign(camp.id)" />
                                </div>
                            </div>
                            <div class="cursor-pointer" @click="navigateTo(`/dashboard/com/campagne/${camp.id}`)">
                                <h4 class="font-bold truncate">{{ camp.name }}</h4>
                                <p class="text-xs text-dimmed truncate mt-0.5">{{ camp.subject }}</p>
                            </div>
                            <div class="flex items-center justify-between pt-2 border-t border-default text-[10px] text-dimmed font-bold">
                                <span class="flex items-center gap-1">
                                  <UIcon name="i-lucide:users" class="size-3" />
                                  {{ camp.totalRecipients || 0 }}
                                </span>
                                <div class="flex items-center gap-2">
                                  <span v-if="camp.openedCount > 0 && camp.totalRecipients > 0" class="text-success-500 flex items-center gap-1">
                                    <UIcon name="i-lucide:eye" class="size-3" />
                                    {{ Math.round((camp.openedCount / camp.totalRecipients) * 100) }}%
                                  </span>
                                  <UButton icon="i-lucide:bar-chart-3" variant="ghost" color="neutral" size="xs" />
                                </div>
                            </div>
                        </div>
                    </UCard>
                </div>

                <div v-if="!loading && campaigns.length === 0" class="text-center py-16 text-dimmed">
                  <UIcon name="i-lucide:send" class="size-12 mx-auto mb-4 opacity-20" />
                  <p class="font-bold">Aucune campagne</p>
                  <p class="text-sm mt-1">Créez votre première campagne en cliquant sur la carte ci-dessus.</p>
                </div>
            </div>

            <!-- ═══ SECTION: MODÈLES ═══ -->
            <div v-if="activeSection === 'templates'" class="space-y-6">
                <h3 class="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <UIcon name="i-lucide:layout" class="size-4 text-primary" />
                  Modèles ({{ templates.length }})
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <NuxtLink to="/dashboard/com/modele/nouveau">
                    <UCard class="border-2 border-dashed border-info-500/30 hover:border-info-500/60 hover:bg-info-500/5 transition-all cursor-pointer group h-full">
                      <div class="flex flex-col items-center justify-center gap-4 py-6 text-center h-full">
                        <div class="size-12 rounded-2xl bg-info-500/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                          <UIcon name="i-lucide:plus" class="size-6 text-info-500" />
                        </div>
                        <div>
                          <h4 class="font-black text-sm uppercase tracking-widest text-info-500">Nouveau Modèle</h4>
                        </div>
                      </div>
                    </UCard>
                  </NuxtLink>

                  <UCard v-for="tpl in templates" :key="tpl.id" class="group hover:bg-neutral-50 cursor-pointer" @click="navigateTo(`/dashboard/com/modele/${tpl.id}`)">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <UIcon :name="tpl.icon || 'i-lucide:mail'" class="size-5 text-primary" />
                        <span class="font-bold text-sm">{{ tpl.name }}</span>
                      </div>
                      <UIcon name="i-lucide:chevron-right" class="size-4 opacity-0 group-hover:opacity-100" />
                    </div>
                  </UCard>
                </div>
            </div>


            <!-- ═══ SECTION: AUDIENCE ═══ -->
            <div v-if="activeSection === 'audience'" class="space-y-6">
                <div class="flex items-center justify-between flex-wrap gap-4">
                  <h3 class="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    <UIcon name="i-lucide:users" class="size-4 text-primary" />
                    Audience ({{ filteredAudience.length }})
                  </h3>
                  <div class="flex gap-2">
                    <UButton label="Exporter CSV" icon="i-lucide:download" variant="ghost" color="neutral" size="sm" @click="exportAudience" />
                    <UButton label="Importer" icon="i-lucide:upload" color="primary" size="sm" />
                  </div>
                </div>

                <!-- FILTRES CONTEXTE -->
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in audienceContextOptions"
                    :key="opt.value"
                    class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-black uppercase transition-all"
                    :class="audienceFilter === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-default bg-white dark:bg-neutral-900 text-dimmed hover:border-neutral-300'"
                    @click="audienceFilter = opt.value as any"
                  >
                    <UIcon :name="opt.icon" class="size-3.5" />
                    {{ opt.label }}
                    <span class="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black" :class="audienceFilter === opt.value ? 'bg-primary/20' : 'bg-neutral-100 dark:bg-neutral-800'">
                      {{ opt.count.value }}
                    </span>
                  </button>

                  <UInput
                    v-model="audienceSearch"
                    placeholder="Rechercher un email..."
                    icon="i-lucide:search"
                    size="sm"
                    class="ml-auto max-w-56"
                  />
                </div>

                <!-- TABLEAU GRANULAIRE -->
                <UCard class="bg-white dark:bg-neutral-900 border-none overflow-hidden">
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="border-b border-default">
                        <tr class="text-[10px] font-black uppercase tracking-widest text-dimmed">
                          <th class="px-4 py-3 w-10">
                            <UCheckbox :model-value="selectedItems.length === filteredAudience.length && filteredAudience.length > 0" @change="selectAll(filteredAudience)" />
                          </th>
                          <th class="px-4 py-3">Email</th>
                          <th class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                              <UIcon name="i-lucide:mail" class="size-3" />
                              Newsletter
                            </div>
                          </th>
                          <th class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                              <UIcon name="i-lucide:git-commit-horizontal" class="size-3" />
                              Changelog
                            </div>
                          </th>
                          <th class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                              <UIcon name="i-lucide:tag" class="size-3" />
                              Promo
                            </div>
                          </th>
                          <th class="px-4 py-3">Source</th>
                          <th class="px-4 py-3">Inscription</th>
                          <th class="px-4 py-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default">
                        <tr v-for="sub in filteredAudience" :key="sub.id" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                          <td class="px-4 py-3">
                            <UCheckbox :model-value="selectedItems.includes(sub.id)" @change="toggleSelection(sub.id)" />
                          </td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-3">
                              <UAvatar :src="sub.avatar?.src" size="2xs" />
                              <span class="font-bold text-sm truncate max-w-48">{{ sub.email }}</span>
                            </div>
                          </td>
                          <!-- Newsletter toggle -->
                          <td class="px-4 py-3 text-center">
                            <button
                              class="size-6 rounded-full mx-auto flex items-center justify-center transition-all duration-200 border-2"
                              :class="sub.optInNewsletter
                                ? 'bg-primary border-primary text-white'
                                : 'border-neutral-200 dark:border-neutral-700 text-transparent hover:border-primary/40'"
                              :disabled="updatingOptIn === `${sub.id}-optInNewsletter`"
                              @click="toggleOptIn(sub, 'optInNewsletter')"
                            >
                              <UIcon v-if="updatingOptIn === `${sub.id}-optInNewsletter`" name="i-lucide:loader-2" class="size-3 animate-spin text-primary" />
                              <UIcon v-else-if="sub.optInNewsletter" name="i-lucide:check" class="size-3" />
                            </button>
                          </td>
                          <!-- Changelog toggle -->
                          <td class="px-4 py-3 text-center">
                            <button
                              class="size-6 rounded-full mx-auto flex items-center justify-center transition-all duration-200 border-2"
                              :class="sub.optInChangelog
                                ? 'bg-info-500 border-info-500 text-white'
                                : 'border-neutral-200 dark:border-neutral-700 text-transparent hover:border-info-500/40'"
                              :disabled="updatingOptIn === `${sub.id}-optInChangelog`"
                              @click="toggleOptIn(sub, 'optInChangelog')"
                            >
                              <UIcon v-if="updatingOptIn === `${sub.id}-optInChangelog`" name="i-lucide:loader-2" class="size-3 animate-spin text-info-500" />
                              <UIcon v-else-if="sub.optInChangelog" name="i-lucide:check" class="size-3" />
                            </button>
                          </td>
                          <!-- Promo toggle -->
                          <td class="px-4 py-3 text-center">
                            <button
                              class="size-6 rounded-full mx-auto flex items-center justify-center transition-all duration-200 border-2"
                              :class="sub.optInMarketing
                                ? 'bg-warning-500 border-warning-500 text-white'
                                : 'border-neutral-200 dark:border-neutral-700 text-transparent hover:border-warning-500/40'"
                              :disabled="updatingOptIn === `${sub.id}-optInMarketing`"
                              @click="toggleOptIn(sub, 'optInMarketing')"
                            >
                              <UIcon v-if="updatingOptIn === `${sub.id}-optInMarketing`" name="i-lucide:loader-2" class="size-3 animate-spin text-warning-500" />
                              <UIcon v-else-if="sub.optInMarketing" name="i-lucide:check" class="size-3" />
                            </button>
                          </td>
                          <td class="px-4 py-3">
                            <span class="text-[10px] font-black uppercase text-dimmed">{{ sub.source || 'LANDING' }}</span>
                          </td>
                          <td class="px-4 py-3 text-xs text-toned">{{ sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('fr-FR') : '—' }}</td>
                          <td class="px-4 py-3">
                            <UBadge
                              :label="sub.isActive ? 'Actif' : 'Désabonné'"
                              size="xs"
                              variant="soft"
                              :color="sub.isActive ? 'success' : 'error'"
                            />
                          </td>
                        </tr>
                        <tr v-if="filteredAudience.length === 0">
                          <td colspan="8" class="text-center py-12 text-dimmed">
                            <UIcon name="i-lucide:users" class="size-10 mx-auto mb-3 opacity-20" />
                            <p class="font-bold">Aucun abonné</p>
                            <p class="text-sm">pour ce filtre de contexte.</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </UCard>
            </div>


        </div>
      </main>
    </div>
  </UDashboardPanel>
</template>

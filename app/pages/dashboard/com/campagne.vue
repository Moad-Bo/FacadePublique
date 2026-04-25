<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  title: 'Centre de Campagne',
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: ['manage_campaign']
})

const { aliases, fetchSettings, campaignTypes } = useCampaigns()
const notify = useNotify()

const activeSection = ref('campaigns')
const loading = ref(false)
const campaigns = ref<any[]>([])
const templates = ref<any[]>([])
const audience = ref<any[]>([])

// --- Sidebar Navigation ---
const navigation = [
  { label: 'Campagnes', icon: 'i-lucide:send', value: 'campaigns' },
  { label: 'Modèles', icon: 'i-lucide:layout', value: 'templates' },
  { label: 'Audience', icon: 'i-lucide:users', value: 'audience' }
]

// --- Stats (Shared for now) ---
const stats = ref([
    { label: 'Total Envois', value: '12.4k', icon: 'i-lucide:mail', color: 'primary' },
    { label: 'Taux Ouverture', value: '24.8%', icon: 'i-lucide:eye', color: 'success' },
    { label: 'Taux Clic', value: '3.2%', icon: 'i-lucide:mouse-pointer-2', color: 'info' },
    { label: 'Abonnés', value: '1,240', icon: 'i-lucide:users', color: 'warning' }
])

// --- Fetch Logic ---
const fetchData = async () => {
    loading.value = true
    try {
        const [cRes, tRes, aRes] = await Promise.all([
            $fetch<any>('/api/campaign/campaigns'),
            $fetch<any>('/api/campaign/templates'),
            $fetch<any>('/api/campaign/audience')
        ])

        if (cRes.success) campaigns.value = cRes.campaigns
        if (tRes.success) templates.value = tRes.templates
        audience.value = aRes || []
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

// --- Campaign Logic ---
const createCampaign = (type: string) => {
    notify.info('Initialisation...', `Création d'une campagne de type : ${type}`)
     navigateTo(`/dashboard/com/skeleton?mode=new_campaign&type=${type}`)
}

const deleteCampaign = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    try {
        await $fetch(`/api/campaign/campaigns?id=${id}`, { method: 'DELETE' })
        notify.success('Supprimé')
        fetchData()
    } catch (e) {
        notify.error('Erreur')
    }
}

// --- Modèle Logic ---
const editTemplate = (tpl: any) => {
    navigateTo(`/dashboard/com/skeleton?mode=edit_template&id=${tpl.id}`)
}

// --- Audience Logic ---
const exportAudience = () => {
    notify.success('Export lancé...', 'Votre fichier CSV sera prêt dans un instant.')
}

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
           <p class="text-[10px] font-black uppercase text-dimmed mb-2">Expéditeur Actuel</p>
           <div v-if="aliases.length > 0" class="flex flex-col gap-1">
              <span class="text-xs font-bold truncate">{{ aliases[0].label }}</span>
              <span class="text-[10px] text-primary truncate italic">{{ aliases[0].email }}</span>
           </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 overflow-y-auto bg-neutral-50/50 dark:bg-neutral-950/20">
        
        <!-- TOOLBAR STATS -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-default">
            <UCard v-for="stat in stats" :key="stat.label" :ui="{ body: 'p-4' }" class="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                <div class="flex items-center gap-3">
                    <div :class="`size-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}`">
                        <UIcon :name="stat.icon" class="size-5" />
                    </div>
                    <div>
                        <p class="text-[10px] text-dimmed uppercase font-black tracking-widest">{{ stat.label }}</p>
                        <p class="text-xl font-black italic">{{ stat.value }}</p>
                    </div>
                </div>
            </UCard>
        </div>

        <div class="p-6 max-w-7xl mx-auto space-y-8">
            
            <!-- SECTION: CAMPAIGNS -->
            <div v-if="activeSection === 'campaigns'" class="space-y-6">
                
                <h3 class="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                   <UIcon name="i-lucide:send" class="size-4 text-primary" />
                   Campagnes actives
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- NEW CAMPAIGN CARD -->
                    <UCard class="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all bg-primary/5 group cursor-pointer overflow-hidden relative">
                        <div class="flex flex-col h-full gap-4 relative z-10">
                            <h4 class="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                               <UIcon name="i-lucide:plus-circle" class="size-4" />
                               Nouvelle Campagne
                            </h4>
                            <p class="text-xs text-dimmed font-medium">Choisissez le canal de diffusion pour votre communication.</p>
                            
                            <div class="grid grid-cols-1 gap-2 pt-2">
                                <UButton 
                                  v-for="type in campaignTypes" 
                                  :key="type.id" 
                                  :icon="type.icon" 
                                  :label="type.label"
                                  :color="type.color as any" 
                                  variant="soft" 
                                  size="sm" 
                                  class="justify-start font-bold"
                                  @click="createCampaign(type.id)"
                                />
                            </div>
                        </div>
                        <UIcon name="i-lucide:sparkles" class="absolute -right-4 -bottom-4 size-24 opacity-5 text-primary rotate-12" />
                    </UCard>

                    <!-- CAMPAIGN CARDS -->
                    <UCard v-for="camp in campaigns" :key="camp.id" class="group hover:ring-2 hover:ring-primary/30 transition-all">
                        <div class="flex flex-col gap-4">
                            <div class="flex justify-between items-start">
                                 <UBadge 
                                   :label="camp.type?.toUpperCase() || 'EMAIL'" 
                                   size="xs" 
                                   variant="soft" 
                                   :color="camp.type === 'notification' ? 'warning' : (camp.type === 'forum' ? 'info' : 'primary')" 
                                   class="font-black text-[9px]"
                                 />
                                 <div class="flex items-center gap-1">
                                    <UBadge :label="camp.status.toUpperCase()" size="xs" variant="outline" :color="camp.status === 'sent' ? 'success' : 'neutral'" class="text-[8px] px-1 py-0" />
                                    <UButton icon="i-lucide:trash-2" variant="ghost" color="error" size="sm" class="opacity-0 group-hover:opacity-100" @click.stop="deleteCampaign(camp.id)" />
                                 </div>
                            </div>
                            <div class="cursor-pointer" @click="navigateTo(`/dashboard/com/skeleton?mode=edit_campaign&id=${camp.id}`)">
                                <h4 class="font-bold truncate">{{ camp.name }}</h4>
                                <p class="text-xs text-dimmed truncate">{{ camp.subject }}</p>
                            </div>
                            <div class="flex items-center justify-between pt-2 border-t border-default text-[10px] text-dimmed font-bold">
                                <span>🗣️ {{ camp.totalRecipients || 0 }}</span>
                                <div class="flex items-center gap-2">
                                  <span v-if="camp.openedCount > 0" class="text-success-500">👁️ {{ Math.round((camp.openedCount / camp.totalRecipients) * 100) }}%</span>
                                  <UButton icon="i-lucide:bar-chart-3" variant="ghost" color="neutral" size="xs" />
                                </div>
                            </div>
                        </div>
                    </UCard>
                </div>
            </div>

            <!-- SECTION: TEMPLATES -->
            <div v-if="activeSection === 'templates'" class="space-y-6">
                <div class="flex items-center justify-between">
                   <h3 class="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      <UIcon name="i-lucide:layout" class="size-4 text-primary" />
                      Modèles Agnostiques
                   </h3>
                   <UButton label="Nouveau Modèle" icon="i-lucide:plus" color="primary" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <UCard v-for="tpl in templates" :key="tpl.id" class="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors" @click="editTemplate(tpl)">
                      <div class="flex items-center justify-between">
                         <div class="flex items-center gap-3">
                            <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                               <UIcon :name="tpl.icon || 'i-lucide:mail'" class="size-5" />
                            </div>
                            <div>
                               <span class="font-bold block text-sm">{{ tpl.name }}</span>
                               <span class="text-[10px] text-dimmed uppercase font-black">{{ tpl.layoutId || 'campaign' }}</span>
                            </div>
                         </div>
                         <UIcon name="i-lucide:chevron-right" class="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                   </UCard>
                </div>
            </div>

            <!-- SECTION: AUDIENCE -->
            <div v-if="activeSection === 'audience'" class="space-y-6">
                <div class="flex items-center justify-between">
                   <h3 class="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      <UIcon name="i-lucide:users" class="size-4 text-primary" />
                      Gestion Audience ({{ audience.length }})
                   </h3>
                   <div class="flex gap-2">
                      <UButton label="Exporter CSV" icon="i-lucide:download" variant="ghost" color="neutral" @click="exportAudience" />
                      <UButton label="Importer" icon="i-lucide:upload" color="primary" />
                   </div>
                </div>

                <UCard class="bg-white dark:bg-neutral-900 border-none">
                   <div class="overflow-x-auto">
                      <table class="w-full text-left text-sm">
                         <thead class="border-b border-default">
                            <tr class="text-[10px] font-black uppercase tracking-widest text-dimmed">
                               <th class="px-4 py-3">Utilisateur</th>
                               <th class="px-4 py-3">Email</th>
                               <th class="px-4 py-3">Status Marketing</th>
                               <th class="px-4 py-3">Source</th>
                               <th class="px-4 py-3">Date</th>
                            </tr>
                         </thead>
                         <tbody class="divide-y divide-default">
                            <tr v-for="sub in audience" :key="sub.id" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                               <td class="px-4 py-3">
                                  <div class="flex items-center gap-3">
                                     <UAvatar :src="sub.avatar?.src" size="2xs" />
                                     <span class="font-bold">{{ sub.email.split('@')[0] }}</span>
                                  </div>
                               </td>
                               <td class="px-4 py-3 text-toned">{{ sub.email }}</td>
                               <td class="px-4 py-3">
                                  <UBadge :label="sub.unsubscribedAt ? 'Désabonné' : 'Actif'" size="xs" variant="soft" :color="sub.unsubscribedAt ? 'error' : 'success'" />
                               </td>
                               <td class="px-4 py-3">
                                  <span class="text-[10px] font-black uppercase text-dimmed">{{ sub.source || 'LANDING' }}</span>
                               </td>
                               <td class="px-4 py-3 text-xs text-toned">{{ new Date(sub.createdAt).toLocaleDateString() }}</td>
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

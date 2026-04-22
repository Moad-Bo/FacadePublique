<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: 'manage_newsletter',
  title: 'Newsletter & Campagnes'
})

const notify = useNotify()
const { openComposer } = useComposer()

// --- DATA FETCHING ---
const { data: subscribers } = await useFetch<any[]>('/api/newsletter-subscribers', { lazy: true, default: () => [] })
const { data: templatesData, refresh: refreshTemplates } = await useFetch<{success: boolean, templates: any[]}>('/api/newsletter/templates', { lazy: true, default: () => ({ success: true, templates: [] }) })
const { data: campaignsData, refresh: refreshCampaigns } = await useFetch<{success: boolean, campaigns: any[]}>('/api/newsletter/campaigns', { lazy: true, default: () => ({ success: true, campaigns: [] }) })

const templates = computed(() => templatesData.value?.templates || [])
const campaigns = computed(() => campaignsData.value?.campaigns || [])

const stats = computed(() => {
  const totalSent = campaigns.value.reduce((acc: number, c: any) => acc + (c.totalRecipients || 0), 0)
  const totalOpened = campaigns.value.reduce((acc: number, c: any) => acc + (c.openedCount || 0), 0)
  const totalDelivered = campaigns.value.reduce((acc: number, c: any) => acc + (c.deliveredCount || 0), 0)
  const avgOpenRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0

  return [
    { label: 'Abonnés', value: subscribers.value.length, icon: 'i-lucide:users', color: 'primary' },
    { label: 'Campagnes', value: campaigns.value.length, icon: 'i-lucide:mail', color: 'success' },
    { label: 'Total Livrés', value: totalDelivered, icon: 'i-lucide:check-circle', color: 'info' },
    { label: 'Taux d\'Ouverture', value: `${avgOpenRate}%`, icon: 'i-lucide:eye', color: 'warning' }
  ]
})

// --- ACTIONS VIA UNIVERSAL COMPOSER ---
const createCampaign = () => {
    openComposer({ mode: 'newsletter', isCreation: true })
}

const editCampaign = (c: any) => {
    openComposer({
        mode: 'newsletter',
        id: c.id,
        name: c.name,
        subject: c.subject,
        body: c.content,
        templateId: c.templateId,
        layoutId: c.layoutId,
        scheduledAt: c.scheduledAt,
        recurrence: c.recurrence
    })
}

const createTemplate = () => {
    openComposer({ mode: 'layout', isCreation: true, category: 'newsletter' })
}

const editTemplate = (t: any) => {
    openComposer({
        mode: 'layout',
        id: t.id,
        name: t.name,
        subject: t.subject,
        body: t.content || t.html,
        category: 'newsletter',
        description: t.description
    })
}

const deleteCampaign = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    await $fetch('/api/newsletter/campaigns', { method: 'DELETE', body: { id } })
    refreshCampaigns()
    notify.success('Supprimé')
}

// --- TABS ---
const activeTab = ref('campaigns')
const mainTabs = [
    { label: 'Campagnes', value: 'campaigns', icon: 'i-lucide:send' },
    { label: 'Modèles', value: 'templates', icon: 'i-lucide:layout' }
]
</script>

<template>
  <UDashboardPanel grow>
    <UDashboardNavbar title="Newsletter">
        <template #right>
            <UButton v-if="activeTab === 'campaigns'" label="Nouvelle Campagne" icon="i-lucide:plus" color="primary" @click="createCampaign" />
            <UButton v-else label="Nouveau Modèle" icon="i-lucide:plus" color="primary" @click="createTemplate" />
        </template>
    </UDashboardNavbar>

    <UDashboardToolbar>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full p-4">
            <UCard v-for="stat in stats" :key="stat.label">
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
    </UDashboardToolbar>

    <div class="px-6 py-4">
        <UTabs v-model="activeTab" :items="mainTabs" class="w-full" />
    </div>

    <div class="p-6">
        <!-- CAMPAIGNS VIEW -->
        <div v-if="activeTab === 'campaigns'" class="space-y-6">
            <div v-if="campaigns.length === 0" class="flex flex-col items-center justify-center py-20 opacity-40">
                <UIcon name="i-lucide:mail-search" class="size-12 mb-4" />
                <p>Aucune campagne.</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <UCard v-for="campaign in campaigns" :key="campaign.id" class="group hover:ring-2 hover:ring-primary/30 transition-all">
                    <div class="flex flex-col gap-4">
                        <div class="flex justify-between items-start">
                             <UBadge :label="campaign.status.toUpperCase()" size="xs" variant="soft" :color="campaign.status === 'sent' ? 'success' : (campaign.status === 'scheduled' ? 'info' : 'neutral')" />
                             <UButton icon="i-lucide:trash-2" variant="ghost" color="error" size="sm" class="opacity-0 group-hover:opacity-100" @click.stop="deleteCampaign(campaign.id)" />
                        </div>
                        <div class="cursor-pointer" @click="editCampaign(campaign)">
                            <h4 class="font-bold truncate">{{ campaign.name }}</h4>
                            <p class="text-xs text-dimmed truncate">{{ campaign.subject }}</p>
                        </div>
                        <div class="flex items-center justify-between pt-2 border-t border-default text-[10px] text-dimmed font-bold">
                            <span>🗣️ {{ campaign.totalRecipients || 0 }}</span>
                            <UButton icon="i-lucide:bar-chart-3" variant="ghost" color="neutral" size="xs" @click="editCampaign(campaign)" />
                        </div>
                    </div>
                </UCard>
            </div>
        </div>

        <!-- TEMPLATES VIEW -->
        <div v-else class="space-y-6">
            <div v-for="tpl in templates" :key="tpl.id" class="group p-4 rounded-xl border border-default hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer" @click="editTemplate(tpl)">
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-3">
                      <UIcon :name="tpl.icon || 'i-lucide:mail'" class="size-5 text-primary" />
                      <span class="font-bold">{{ tpl.name }}</span>
                   </div>
                   <UIcon name="i-lucide:paintbrush" class="size-4 opacity-0 group-hover:opacity-100" />
                </div>
            </div>
        </div>
    </div>
  </UDashboardPanel>
</template>

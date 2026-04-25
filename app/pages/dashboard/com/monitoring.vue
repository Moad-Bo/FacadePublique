<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement
} from 'chart.js'
import { Bar, Line, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, ArcElement)

definePageMeta({
  title: 'Monitoring & KPI',
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: ['manage_mail', 'manage_newsletter']
})

const route = useRoute()
const localePath = useLocalePath()
const notify = useNotify()

// --- QUOTA LOGIC ---
const quota = ref({
    limit: 3000,
    period: 30,
    currentUsage: 0,
    percent: 0
})

const savingQuota = ref(false)
const fetchQuota = async () => {
    try {
        const res = await $fetch<any>('/api/mails/settings')
        if (res.success) {
            quota.value = res.settings
        }
    } catch (e) {
        console.error('Failed to fetch quota', e)
    }
}

const updateQuota = async (newLimit: number, newPeriod: number) => {
    savingQuota.value = true
    try {
        await $fetch('/api/mails/settings', {
            method: 'POST',
            body: { limit: Number(newLimit), period: Number(newPeriod) }
        })
        await fetchQuota()
        notify.success('Quota mis à jour')
    } catch (e: any) {
        notify.error('Erreur', e.message)
    } finally {
        savingQuota.value = false
    }
}

const resetQuotaSaving = ref(false)
const resetQuota = async () => {
    resetQuotaSaving.value = true
    try {
        await $fetch('/api/admin/com/quota', { method: 'POST' })
        quota.value.currentUsage = 0
        quota.value.percent = 0
        notify.success('Quota réinitialisé avec succès')
    } catch (e: any) {
        notify.error('Erreur', e.message)
    } finally {
        resetQuotaSaving.value = false
    }
}

onMounted(() => {
    fetchQuota()
})

// --- MOCKED CHART DATA ---

// 1. Croissance 30 Jours (Line Chart)
const growthOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    title: { display: false }
  }
}
const growthData = {
  labels: Array.from({ length: 30 }, (_, i) => `J-${30 - i}`),
  datasets: [
    {
      label: 'Commentateurs Blog',
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      data: Array.from({ length: 30 }, (_, i) => 100 + i * 5 + Math.floor(Math.random() * 20)),
      tension: 0.4
    },
    {
      label: 'Membres Community',
      backgroundColor: '#10b981',
      borderColor: '#10b981',
      data: Array.from({ length: 30 }, (_, i) => 50 + i * 8 + Math.floor(Math.random() * 30)),
      tension: 0.4
    },
    {
      label: 'Abonnés Newsletter',
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
      data: Array.from({ length: 30 }, (_, i) => 200 + i * 2 + Math.floor(Math.random() * 10)),
      tension: 0.4
    }
  ]
}

// 2. Community Stats (Doughnut Chart)
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const }
  }
}
const forumData = {
  labels: ['Résolus', 'En attente', 'Nouveaux (période)'],
  datasets: [
    {
      backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
      data: [350, 120, 85]
    }
  ]
}

// 3. Total Stats (Bar Chart)
const totalsData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
  datasets: [
    {
      label: 'Membres Globaux',
      backgroundColor: '#8b5cf6',
      data: [1200, 1350, 1420, 1580, 1690, 1850]
    },
    {
      label: 'Posts & Commentaires',
      backgroundColor: '#ec4899',
      data: [3200, 4100, 3900, 4800, 5200, 6100]
    }
  ]
}

// 4. Rétention Membres (Line Chart)
const retentionData = {
  labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'],
  datasets: [
    {
      label: 'Taux de rétention (%)',
      backgroundColor: '#f43f5e',
      borderColor: '#f43f5e',
      data: [100, 85, 76, 72],
      tension: 0.4
    }
  ]
}

</script>

<template>
  <UDashboardPanel id="mailing-dashboard" grow>
    <div class="flex-1 overflow-auto bg-neutral-50/50 dark:bg-neutral-950/20">
      <div class="p-4 lg:p-6 space-y-8 max-w-7xl mx-auto">
        
        <!-- TOP SECTION: RATE LIMIT (1/4) & GROWTH CHART (3/4) -->
        <div class="flex flex-col lg:flex-row gap-6">
          
          <!-- QUOTA CARD (25% width) -->
          <UCard class="w-full lg:w-1/4 relative overflow-hidden flex flex-col">
              <div class="absolute -right-12 -bottom-12 opacity-[0.03] pointer-events-none">
                  <UIcon name="i-lucide:zap" class="size-64 text-primary" />
              </div>

              <div class="space-y-6 relative z-10 flex-1 flex flex-col justify-center">
                  <div>
                      <div class="flex items-center gap-2 mb-1">
                          <UIcon name="i-lucide:gauge" class="size-5 text-primary" />
                          <h3 class="text-sm font-black uppercase italic tracking-tight text-highlighted">Rate Limit</h3>
                      </div>
                      <p class="text-[10px] text-dimmed">
                          Utilisation globale : <span class="font-bold text-primary">{{ quota.currentUsage }}</span> envois / <span class="font-bold">{{ quota.period }}</span> jours.
                      </p>
                  </div>

                  <div class="space-y-4">
                      <UFormField label="Limite d'envois" size="xs">
                          <UInput v-model="quota.limit" type="number" />
                      </UFormField>
                      <UFormField label="Période (jours)" size="xs">
                          <UInput v-model="quota.period" type="number" />
                      </UFormField>
                      <div class="flex items-center gap-2">
                        <UButton 
                          label="Sauvegarder" 
                          icon="i-lucide:save" 
                          color="primary" 
                          size="xs" 
                          class="flex-1"
                          :loading="savingQuota"
                          @click="updateQuota(quota.limit, quota.period)" 
                        />
                        <UButton 
                          icon="i-lucide:rotate-ccw" 
                          color="neutral" 
                          variant="ghost"
                          size="xs" 
                          :loading="resetQuotaSaving"
                          @click="resetQuota" 
                          title="Réinitialiser le compteur de quota"
                        />
                      </div>
                  </div>

                  <div class="space-y-2 mt-auto pt-4 border-t border-primary/10">
                       <div class="flex justify-between items-end px-1">
                           <span class="text-[10px] font-black uppercase text-dimmed tracking-widest">Utilisation du quota</span>
                           <span class="text-xs font-black text-primary">{{ quota.percent }}%</span>
                       </div>
                       <UProgress :value="quota.percent" size="sm" color="primary" class="h-2" />
                  </div>
              </div>
          </UCard>

          <!-- GROWTH CHART (75% width, 1.7x height of normal card -> ~400px minimum height) -->
          <UCard class="w-full lg:w-3/4 flex flex-col" :ui="{ body: 'flex-1 min-h-[400px] flex flex-col' }">
            <template #header>
               <h3 class="font-black text-sm uppercase tracking-widest">Croissance Communautaire (30 Jours)</h3>
            </template>
            <div class="relative flex-1 w-full h-full min-h-[300px]">
               <Line :data="growthData" :options="growthOptions" />
            </div>
          </UCard>

        </div>

        <!-- BOTTOM SECTION: METRICS GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- TOTAL METRICS -->
          <UCard class="flex flex-col">
            <template #header>
               <h3 class="font-black text-xs uppercase text-dimmed tracking-widest">Activité Globale (Posts)</h3>
            </template>
            <div class="relative w-full h-48">
               <Bar :data="totalsData" :options="baseOptions" />
            </div>
          </UCard>
          
          <!-- FORUM STATS -->
          <UCard class="flex flex-col">
            <template #header>
               <h3 class="font-black text-xs uppercase text-dimmed tracking-widest">Statut du Community</h3>
            </template>
            <div class="relative w-full h-48">
               <Doughnut :data="forumData" :options="baseOptions" />
            </div>
          </UCard>

          <!-- RETENTION -->
          <UCard class="flex flex-col">
            <template #header>
               <h3 class="font-black text-xs uppercase text-dimmed tracking-widest">Rétention Membres</h3>
            </template>
            <div class="relative w-full h-48">
               <Line :data="retentionData" :options="baseOptions" />
            </div>
          </UCard>

        </div>

      </div>
    </div>
  </UDashboardPanel>
</template>



<script setup lang="ts">
import { computed, ref } from 'vue'
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
  ArcElement,
  Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement, ArcElement, Filler)

definePageMeta({
  layout: 'dashboard',
  title: 'Cockpit Stratégique'
})

const loading = ref(false)

// --- MOCKED DATA WITH EXPLANATORY LOGIC ---

// 1. BLOG KPI: Croisement Lecture vs Conversion
// Logique : On mesure si un article lu pousse l'utilisateur à s'abonner (Conversion)
const blogData = {
  labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  datasets: [
    {
      label: 'Lectures (Vues)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3b82f6',
      data: [1200, 1900, 1500, 2100, 2400, 1800, 1600],
      fill: true,
      tension: 0.4
    },
    {
      label: 'Inscriptions Newsletter (Conv)',
      backgroundColor: '#10b981',
      borderColor: '#10b981',
      data: [45, 82, 60, 95, 110, 70, 65],
      tension: 0.4,
      yAxisID: 'y1',
    }
  ]
}

const blogOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { display: true, position: 'left' as const },
    y1: { display: true, position: 'right' as const, grid: { drawOnChartArea: false } }
  },
  plugins: { legend: { position: 'bottom' as const } }
}

// 2. FORUM KPI: Santé de la Communauté
// Logique : Ratio entre les questions posées et les solutions trouvées
const forumData = {
  labels: ['Threads Résolus', 'En attente', 'Spam / Rejetés'],
  datasets: [{
    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
    data: [65, 25, 10],
    borderWidth: 0
  }]
}

// 3. CAMPAGNES KPI: Performance de l'Entonnoir
// Logique : On suit la déperdition entre l'envoi, l'ouverture et le clic effectif
const campaignData = {
  labels: ['Envoyés', 'Ouverts', 'Cliqués'],
  datasets: [{
    label: 'Volume',
    backgroundColor: ['#8b5cf6', '#a855f7', '#d946ef'],
    data: [10000, 4200, 850],
    borderRadius: 8
  }]
}

// 4. ESPACE PUBLIQUE: Score de Vitalité (Mocked KPI)
// Logique : Indice calculé basé sur (Trafic Organique / Temps de Session)
const vitalityScore = ref(78)
const refreshWithLoading = () => {
  loading.value = true
  setTimeout(() => loading.value = false, 1000)
}

</script>

<template>
  <UDashboardPanel id="home">
    <UDashboardToolbar>
      <template #left>
        <h1 class="text-xl font-black uppercase italic tracking-tighter text-highlighted">
          Pilotage <span class="text-primary">Global</span>
        </h1>
      </template>
      <template #right>
        <div class="flex items-center gap-2">
            <UBadge color="primary" variant="soft" size="xs" class="font-black">SYNC LIVE</UBadge>
            <UButton icon="i-lucide:refresh-cw" variant="ghost" color="neutral" size="sm" @click="refreshWithLoading" />
        </div>
      </template>
    </UDashboardToolbar>

    <div class="p-6 space-y-8 overflow-y-auto">
      
      <!-- TOP KPI GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <UCard v-for="stat in [
            { label: 'Visibilité Publique', value: '8.4k', trend: '+12%', icon: 'i-lucide:eye', color: 'primary', desc: 'Vues uniques sur 24h' },
            { label: 'Conversion Blog', value: '4.2%', trend: '+0.5%', icon: 'i-lucide:trending-up', color: 'success', desc: 'Lecteurs devenus abonnés' },
            { label: 'Entraide Forum', value: '92%', trend: '+5%', icon: 'i-lucide:heart-handshake', color: 'info', desc: 'Taux de réponse < 2h' },
            { label: 'Santé Campagne', value: '98.9%', trend: 'Stable', icon: 'i-lucide:shield-check', color: 'warning', desc: 'Taux de délivrabilité API' }
          ]" :key="stat.label" class="relative overflow-hidden group">
            <div class="space-y-2">
                <div class="flex justify-between items-start">
                    <div :class="`p-2 rounded-lg bg-${stat.color}-500/10`">
                        <UIcon :name="stat.icon" :class="`size-5 text-${stat.color}-500`" />
                    </div>
                    <span :class="`text-[10px] font-black px-1.5 py-0.5 rounded-full bg-${stat.color}-500/10 text-${stat.color}-600`">{{ stat.trend }}</span>
                </div>
                <div>
                    <p class="text-[10px] font-black uppercase text-dimmed tracking-widest">{{ stat.label }}</p>
                    <p class="text-2xl font-black italic">{{ stat.value }}</p>
                    <p class="text-[9px] text-dimmed italic mt-1">{{ stat.desc }}</p>
                </div>
            </div>
            <div class="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                <UIcon :name="stat.icon" class="size-24" />
            </div>
          </UCard>
      </div>

      <!-- MAIN CHARTS GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- BLOG PERFORMANCE -->
          <UCard class="flex flex-col h-[400px]">
              <template #header>
                  <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-black text-sm uppercase tracking-widest">Blog : Engagement & Conversion</h3>
                        <p class="text-[10px] text-dimmed italic">Corrélation entre les lectures et les nouveaux abonnés</p>
                    </div>
                    <UButton icon="i-lucide:external-link" variant="ghost" color="neutral" size="xs" to="/dashboard/com/monitoring" />
                  </div>
              </template>
              <div class="flex-1 relative min-h-0 py-4">
                  <Line :data="blogData" :options="blogOptions" />
              </div>
          </UCard>

          <!-- CAMPAIGN FUNNEL -->
          <UCard class="flex flex-col h-[400px]">
              <template #header>
                  <div>
                      <h3 class="font-black text-sm uppercase tracking-widest">Campagne : Entonnoir de Diffusion</h3>
                      <p class="text-[10px] text-dimmed italic">Analyse de la déperdition sur les 7 derniers jours</p>
                  </div>
              </template>
              <div class="flex-1 relative min-h-0 py-4">
                  <Bar :data="campaignData" :options="{ ...blogOptions, scales: { y: { display: true } } }" />
              </div>
          </UCard>

          <!-- FORUM HEALTH -->
          <UCard class="flex flex-col">
              <template #header>
                  <h3 class="font-black text-sm uppercase tracking-widest">Forum : État de la Modération</h3>
              </template>
              <div class="flex gap-8 items-center p-4">
                  <div class="size-48 relative shrink-0">
                      <Doughnut :data="forumData" :options="{ cutout: '75%', plugins: { legend: { display: false } } }" />
                      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span class="text-2xl font-black italic">90%</span>
                          <span class="text-[8px] font-black uppercase text-dimmed">Sain</span>
                      </div>
                  </div>
                  <div class="flex-1 space-y-4">
                      <div v-for="(val, i) in forumData.datasets[0].data" :key="i" class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                              <div class="size-2 rounded-full" :style="`background-color: ${forumData.datasets[0].backgroundColor[i]}`"></div>
                              <span class="text-xs font-bold text-toned">{{ forumData.labels[i] }}</span>
                          </div>
                          <span class="text-xs font-black">{{ val }}%</span>
                      </div>
                      <p class="text-[10px] text-dimmed italic leading-tight">
                        Note : Un taux de résolution élevé (>70%) indique une communauté auto-suffisante et saine.
                      </p>
                  </div>
              </div>
          </UCard>

          <!-- VITALITY GAUGE (ESPACE PUBLIQUE) -->
          <UCard class="flex flex-col relative overflow-hidden">
                <div class="absolute top-0 right-0 p-8 opacity-5">
                    <UIcon name="i-lucide:zap" class="size-32" />
                </div>
                <template #header>
                    <h3 class="font-black text-sm uppercase tracking-widest">Score de Vitalité Publique</h3>
                </template>
                <div class="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div class="relative">
                        <svg class="size-40 transform -rotate-90">
                            <circle cx="80" cy="80" r="70" stroke="currentColor" stroke-width="12" fill="transparent" class="text-neutral-100 dark:text-neutral-800" />
                            <circle cx="80" cy="80" r="70" stroke="currentColor" stroke-width="12" fill="transparent" :stroke-dasharray="440" :stroke-dashoffset="440 - (440 * vitalityScore) / 100" stroke-linecap="round" class="text-primary transition-all duration-1000 ease-out" />
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span class="text-4xl font-black italic">{{ vitalityScore }}</span>
                            <span class="text-[10px] font-black uppercase text-dimmed tracking-widest">Points</span>
                        </div>
                    </div>
                    <div class="space-y-2 max-w-xs">
                        <p class="text-xs font-bold text-toned italic">"Votre écosystème est plus actif que 82% des plateformes similaires."</p>
                        <p class="text-[10px] text-dimmed leading-relaxed">
                            Ce score croise le temps de lecture moyen du **Blog**, la réactivité du **Forum** et le taux d'ouverture des **Campagnes**.
                        </p>
                    </div>
                </div>
          </UCard>

      </div>

    </div>
  </UDashboardPanel>
</template>

<style scoped>
.text-highlighted {
  color: var(--color-primary-500);
  text-shadow: 0 0 20px rgba(var(--color-primary-500), 0.2);
}
</style>

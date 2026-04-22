<script setup lang="ts">
import { sub } from 'date-fns'
import type { Period, Range } from '~~/app/types/dashboard'

definePageMeta({
  layout: 'dashboard',
  title: 'Accueil'
})

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel id="home">
    <UDashboardToolbar>
      <template #left>
        <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <DashboardHomeDateRangePicker v-model="range" class="-ms-1" />

        <DashboardHomePeriodSelect v-model="period" :range="range" />
      </template>
    </UDashboardToolbar>

    <div class="p-6 space-y-8">
      <!-- QUICK SETTINGS CARD -->
      <UPageGrid>
        <UPageCard
          icon="i-lucide:settings-2"
          title="Configuration du Système"
          description="Gérez vos préférences, les rôles des utilisateurs et les paramètres de votre compte."
          to="/dashboard/settings"
          variant="subtle"
          :ui="{
            leading: 'p-3 rounded-xl bg-primary/10 text-primary',
            title: 'font-bold text-lg',
            description: 'text-sm text-dimmed'
          }"
        >
          <template #footer>
            <div class="flex items-center gap-2 text-xs font-medium text-primary">
              Aller aux paramètres
              <UIcon name="i-lucide:arrow-right" class="size-4" />
            </div>
          </template>
        </UPageCard>
      </UPageGrid>

      <DashboardHomeStats :period="period" :range="range" />
      <DashboardHomeChart :period="period" :range="range" />
      <DashboardHomeSales :period="period" :range="range" />
    </div>
  </UDashboardPanel>
</template>

<script setup lang="ts">
/**
 * UserBadge Component
 * Displays role and community badges for a user.
 */
const props = defineProps<{
  user: {
    role?: string | null
    createdAt?: string | Date | null
    emailVerified?: boolean
  }
}>()

const badges = computed(() => {
  const list: { label: string; color: any; icon: string; tooltip: string }[] = []
  const createdAt = props.user.createdAt ? new Date(props.user.createdAt) : null
  const now = new Date()

  // 1. Staff Badge
  if (props.user.role === 'admin' || props.user.role === 'moderator') {
    list.push({
      label: 'Staff',
      color: 'primary',
      icon: 'i-lucide-shield-check',
      tooltip: 'Membre officiel de l\'équipe Techknè'
    })
  }

  // 2. Day One Badge (Simplified logic: Joined before 2024-11-01)
  const dayOneLimit = new Date('2024-11-01')
  if (createdAt && createdAt < dayOneLimit) {
    list.push({
      label: 'Day One',
      color: 'warning',
      icon: 'i-lucide-sparkles',
      tooltip: 'Pionnier de la communauté'
    })
  }

  // 3. Tenure Badge (Member since X years)
  if (createdAt) {
    const years = now.getFullYear() - createdAt.getFullYear()
    if (years >= 1) {
      list.push({
        label: `${years}Y Member`,
        color: 'neutral',
        icon: 'i-lucide-clock',
        tooltip: `Membre fidèle depuis ${years} an(s)`
      })
    }
  }

  // 4. Verified Badge
  if (props.user.emailVerified) {
    list.push({
      label: 'Vérifié',
      color: 'info',
      icon: 'i-lucide-badge-check',
      tooltip: 'Compte vérifié par mail'
    })
  }

  return list
})
</script>

<template>
  <div class="flex flex-wrap gap-1 items-center">
    <UTooltip v-for="badge in badges" :key="badge.label" :text="badge.tooltip">
      <UBadge
        :color="badge.color"
        variant="subtle"
        size="xs"
        class="rounded-full px-1.5 py-0 font-bold tracking-tighter text-[9px] uppercase flex items-center gap-1"
      >
        <UIcon :name="badge.icon" class="w-2.5 h-2.5" />
        {{ badge.label }}
      </UBadge>
    </UTooltip>
  </div>
</template>

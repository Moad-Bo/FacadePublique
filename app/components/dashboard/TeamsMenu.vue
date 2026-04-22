<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const teams = ref([{
  label: 'Techkne',
  avatar: {
    src: 'https://github.com/nuxt.png',
    alt: 'Techkne'
  }
}, {
  label: 'Kosmos',
  avatar: {
    src: 'https://github.com/nuxt-hub.png',
    alt: 'Kosmos'
  }
}, {
  label: 'Syn',
  avatar: {
    src: 'https://github.com/nuxtlabs.png',
    alt: 'Syn'
  }
}])
const selectedTeam = ref(teams.value[0])

const items = computed<DropdownMenuItem[][]>(() => {
  return [teams.value.map(team => ({
    ...team,
    onSelect() {
      selectedTeam.value = team
    }
  }))]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedTeam,
        label: collapsed ? undefined : selectedTeam?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated overflow-hidden"
      :class="[!collapsed && 'py-2']"
      :ui="{
        label: 'truncate',
        trailingIcon: 'text-dimmed shrink-0'
      }"
    />
  </UDropdownMenu>
</template>

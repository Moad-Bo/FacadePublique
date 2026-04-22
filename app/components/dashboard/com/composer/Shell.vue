<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardComSharedStudio from '@/components/dashboard/com/shared/Studio.vue'

const { 
  isComposerOpen, 
  closeComposer,
} = useComposer()

// --- CENTRALIZED DATA FETCHING ---
const { data: layoutsRes, refresh: refreshLayouts } = useFetch<any>('/api/mails/layouts', {
  key: 'composer-central-layouts',
  default: () => ({ success: true, layouts: [] })
})

const layouts = computed(() => layoutsRes.value?.layouts || [])
const isFullscreen = ref(false)

// Refresh layouts whenever the composer opens to pick up new seeds/updates
watch(isComposerOpen, (open) => {
  if (open) refreshLayouts()
})
</script>

<template>
  <UModal 
    v-model:open="isComposerOpen" 
    :ui="{ 
      content: isFullscreen 
        ? 'w-screen h-screen max-w-none rounded-none' 
        : 'w-[95vw] h-[95vh] sm:h-[95vh] max-w-7xl flex flex-col sm:rounded-[2.5rem] overflow-hidden' 
    }"
  >
    <template #content>
      <!-- THE UNIVERSAL STUDIO ENGINE -->
      <DashboardComSharedStudio 
        :layouts="layouts" 
        :is-fullscreen="isFullscreen"
        @toggle-fullscreen="isFullscreen = !isFullscreen"
        @close="closeComposer"
      />
    </template>
  </UModal>
</template>

<style scoped>
/* Scoped styles are now managed within Studio and shared components */
</style>

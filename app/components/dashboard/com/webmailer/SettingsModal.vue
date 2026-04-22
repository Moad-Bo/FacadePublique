<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  open: boolean
  defaultTab?: 'import-export' | 'blacklist'
}>()

const emit = defineEmits(['update:open'])
const { openComposer, composerStep } = useComposer()

// When this modal is requested to open, we actually open the Composer in settings mode
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const mode = props.defaultTab === 'blacklist' ? 'blacklist_mgmt' : 'import_export'
    openComposer({ mode })
    // Sync step if needed
    if (props.defaultTab === 'blacklist') composerStep.value = 2
    else composerStep.value = 1
    
    // Close this "dummy" modal immediately
    emit('update:open', false)
  }
})
</script>

<template>
  <!-- This component is now a redirector to the Unified Composer Shell -->
  <div v-if="false" />
</template>

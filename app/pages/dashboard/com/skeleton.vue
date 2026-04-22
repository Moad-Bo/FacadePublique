<script setup lang="ts">
// Communication module skeleton page
definePageMeta({
  middleware: ['permission'],
  layout: 'dashboard'
});
</script>

<template>
  <div class="flex items-center justify-center h-full">
     <div class="flex flex-col items-center gap-4">
        <UIcon name="i-lucide:loader-2" class="size-8 animate-spin text-primary" />
        <span class="text-sm text-dimmed font-medium">Chargement du Centre de Comm...</span>
     </div>
  </div>
</template>

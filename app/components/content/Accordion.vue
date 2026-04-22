<template>
  <UAccordion :items="items" :class="class">
    <template #item="{ item }">
      <div class="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
        <slot :name="item.slot || 'item'" :item="item" />
      </div>
    </template>
  </UAccordion>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; content?: string; slot?: string }>;
  class?: string;
}>();
</script>

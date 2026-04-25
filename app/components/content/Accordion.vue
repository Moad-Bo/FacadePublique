<template>
  <UAccordion :items="items" :class="class">
    <template #item="props">
      <div class="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
        <slot :name="(props as any).item?.slot || (props as any).slot || 'item'" :item="(props as any).item || props" />
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

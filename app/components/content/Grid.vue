<template>
  <div :class="['grid gap-4', colsClass]">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  cols?: string | number;
}>();

const colsClass = computed(() => {
  const c = props.cols || 1;
  if (c === 2) return 'md:grid-cols-2';
  if (c === 3) return 'md:grid-cols-3';
  if (c === 4) return 'md:grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-1';
});
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  orientation: {
    type: String,
    default: 'horizontal'
  }
})

const layoutClass = computed(() => {
  return props.orientation === 'vertical' 
    ? 'flex flex-col gap-6'
    : 'grid grid-cols-1 sm:grid-cols-2 md:auto-cols-fr md:grid-flow-col gap-6'
})
</script>

<template>
  <div :class="['not-prose my-8', layoutClass]">
    <slot />
  </div>
</template>

<style scoped>
:deep(img) {
  margin: 0;
  border-radius: 0.5rem;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
:deep(div) {
  display: flex;
}
</style>

<template>
  <UCard :class="class">
    <slot />
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

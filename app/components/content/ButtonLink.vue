<template>
  <UButton
    :to="to"
    :color="color as any"
    :variant="variant as any"
    :size="size as any"
    :class="class"
  >
    <slot />
  </UButton>
</template>

<script setup lang="ts">
defineProps<{
  to: string;
  color?: string;
  variant?: string;
  size?: string;
  class?: string;
}>();
</script>

<script setup lang="ts">
const colorMode = useColorMode();
const cycle = ['system', 'light', 'dark'];

const nextMode = () => {
  const currentIndex = cycle.indexOf(colorMode.preference);
  colorMode.preference = cycle[(currentIndex + 1) % cycle.length];
};

const iconName = computed(() => {
  if (colorMode.preference === 'system') return 'lucide:monitor';
  return colorMode.preference === 'light' ? 'lucide:sun' : 'lucide:moon';
});
</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    :icon="iconName"
    aria-label="Toggle Color Mode"
    @click="nextMode"
  />
</template>

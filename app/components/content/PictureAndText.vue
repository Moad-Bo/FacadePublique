<script setup lang="ts">
defineProps({
  card: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div :class="[
    'not-prose my-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center lg:items-stretch group',
    card ? 'p-8 lg:p-12 rounded-3xl ring-1 ring-neutral-200 dark:ring-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 hover:ring-primary-500/50 transition-all duration-300' : ''
  ]">
    <div class="prose dark:prose-invert max-w-none flex flex-col justify-center order-2 lg:order-1 lg:pr-6">
      <slot />
    </div>
    <div class="picture-wrapper relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-black order-1 lg:order-2">
      <div class="absolute inset-0">
        <slot name="image" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.picture-wrapper :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
  display: block;
}
.picture-wrapper :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

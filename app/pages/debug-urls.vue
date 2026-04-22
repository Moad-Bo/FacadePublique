<script setup lang="ts">
const { locale } = useI18n();
const collectionName = computed(() => `content_${locale.value}`);
const { data: navTree } = await useAsyncData(
  'debug1',
  () => queryCollectionNavigation(collectionName.value as any)
);
const { data: page } = await useAsyncData(
  'debug2', 
  () => queryCollection(collectionName.value as any).first()
);
</script>

<template>
  <div class="p-10 prose dark:prose-invert">
    <h1>Debug Nav Tree ({{ collectionName }})</h1>
    <h2>Global Nav Tree</h2>
    <pre>{{ JSON.stringify(navTree, null, 2) }}</pre>
    <h2>First page path: {{ page?.path }}</h2>
  </div>
</template>

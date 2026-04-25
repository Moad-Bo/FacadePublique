<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const { locale } = useI18n()

const collection = computed(() => `content_${locale.value}`)

const contentPath = computed(() => {
  const stripped = route.path.replace(new RegExp(`^/${locale.value}`), '');
  return `${stripped}`.replace(/\/$/, '');
})

const { data: post } = await useAsyncData(
  `blog-${route.path}`,
  () => {
    const dbPath = `/${locale.value}${contentPath.value}`.replace(/\/\//g, '/');
    return queryCollection(collection.value as any)
      .where('path', '=', dbPath)
      .first();
  },
  { watch: [() => route.path, locale] }
)

if (!post.value && import.meta.server) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  const dbPath = `/${locale.value}${contentPath.value}`.replace(/\/\//g, '/');
  return queryCollectionItemSurroundings(collection.value as any, dbPath, {
    fields: ['description']
  })
}, { watch: [() => route.path, locale] })

useSeoMeta({
  title: () => post.value?.title ? `${post.value.title} — Blog Techknè` : 'Blog — Techknè',
  description: () => post.value?.description,
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.description
})
</script>

<template>
  <NuxtLayout name="blog-post" :page="post">
    <ContentRenderer v-if="post" :value="post" />
    
    <div v-else-if="!post" class="flex flex-col items-center justify-center py-32 text-center">
      <div class="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-6">
        <UIcon name="i-lucide:file-question" class="w-10 h-10 text-neutral-400" />
      </div>
      <h1 class="text-3xl font-extrabold mb-3">Article introuvable</h1>
      <p class="text-neutral-500 mb-8 max-w-sm">Cet article n'existe pas ou a été déplacé.</p>
      <UButton :to="localePath('/blog')" color="primary" size="lg">Retour au blog</UButton>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>

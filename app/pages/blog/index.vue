<script setup lang="ts">
const { locale } = useI18n()
const localePath = useLocalePath()

const collection = computed(() => `content_${locale.value}`)

const { data: posts } = await useAsyncData(
  `blog-list-${locale.value}`,
  () => queryCollection(collection.value as any).where('path', 'LIKE', `/${locale.value}/blog/%`).all(),
  { watch: [locale] }
)

const title = 'Blog'
const description = 'Dernières actualités, articles et tutoriels du groupe Techknè.'

useSeoMeta({
  title: `${title} — Techknè Group`,
  ogTitle: title,
  description,
  ogDescription: description
})
</script>

<template>
  <div class="page-content animate-fade-in relative">
    <UContainer>
      <UPageHeader
        :title="title"
        :description="description"
        class="py-[50px]"
      />

      <UPageBody>
        <UBlogPosts v-if="posts?.length">
          <UBlogPost
            v-for="(post, index) in posts"
            :key="post.path"
            :to="localePath(post.path.replace(new RegExp(`^/${locale}`), ''))"
            :title="post.title"
            :description="post.description"
            :image="post.image"
            :date="post.date ? new Date(post.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined"
            :authors="post.authors"
            :badge="post.badge"
            :orientation="index === 0 ? 'horizontal' : 'vertical'"
            :class="[index === 0 && 'col-span-full']"
            variant="naked"
            :ui="{ description: 'line-clamp-2' }"
          />
        </UBlogPosts>
        
        <div v-else class="text-center py-16 text-neutral-500">
          Aucun article trouvé.
        </div>
      </UPageBody>
    </UContainer>
  </div>
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

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
  <div class="page-content animate-fade-in relative">
    <UContainer v-if="post">
      <UPageHeader
        :title="post.title"
        :description="post.description"
      >
        <template #headline>
          <UBadge
            v-if="post.badge"
            v-bind="post.badge"
            variant="subtle"
          />
          <span v-if="post.badge" class="text-muted mx-2">&middot;</span>
          <time v-if="post.date" class="text-muted">{{ new Date(post.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) }}</time>
        </template>

        <div v-if="post.authors?.length" class="flex flex-wrap items-center gap-3 mt-4">
          <UButton
            v-for="(author, index) in post.authors"
            :key="index"
            :to="author.to"
            color="neutral"
            variant="subtle"
            target="_blank"
            size="sm"
          >
            <UAvatar
              v-if="author.avatar"
              v-bind="author.avatar"
              alt="Author avatar"
              size="2xs"
            />
            {{ author.name }}
          </UButton>
        </div>
      </UPageHeader>

      <UPage>
        <UPageBody>
          <article class="prose prose-neutral dark:prose-invert max-w-none">
            <ContentRenderer :value="post" />
          </article>

          <USeparator v-if="surround?.length" class="mt-16" />

          <div class="mt-8">
            <UContentSurround :surround="surround" />
          </div>

          <!-- Page footer -->
          <footer class="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 not-prose">
            <p>© {{ new Date().getFullYear() }} Techknè Group. Tous droits réservés.</p>
            <UButton
              v-if="post.path"
              :to="`https://github.com/your-org/techkne/edit/main/content${post.path}.md`"
              target="_blank"
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-pencil"
              trailing
            >
              Modifier sur GitHub
            </UButton>
          </footer>
        </UPageBody>

        <template v-if="post?.body?.toc?.links?.length" #right>
          <UContentToc :links="post.body.toc.links" />
        </template>
      </UPage>
    </UContainer>

    <div v-else class="flex flex-col items-center justify-center py-32 text-center">
      <div class="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-6">
        <UIcon name="i-lucide-file-question" class="w-10 h-10 text-neutral-400" />
      </div>
      <h1 class="text-3xl font-extrabold mb-3">Article introuvable</h1>
      <p class="text-neutral-500 mb-8 max-w-sm">Cet article n'existe pas ou a été déplacé.</p>
      <UButton :to="localePath('/blog')" color="primary" size="lg">Retour au blog</UButton>
    </div>
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

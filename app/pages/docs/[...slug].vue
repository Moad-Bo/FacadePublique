<script setup lang="ts">
const route = useRoute();
const localePath = useLocalePath();

// ── Path Resolution ──────────────────────────────────────
const contentPath = computed(() => {
  // If route is /fr/docs/basis-core, we strip /fr to get /docs/basis-core
  const stripped = route.path.replace(new RegExp(`^/${locale.value}`), '');
  return `${stripped}`.replace(/\/$/, '');
});

// ── Data Fetching ────────────────────────────────────────
const { locale } = useI18n();

const fetchPage = (lang: string) => {
  const dbPath = `/${lang}${contentPath.value}`.replace(/\/\//g, '/');
  return queryCollection(`content_${lang}` as any)
    .where('path', '=', dbPath)
    .first();
};

const fetchSurround = (lang: string) => {
  const dbPath = `/${lang}${contentPath.value}`.replace(/\/\//g, '/');
  return queryCollectionItemSurroundings(`content_${lang}` as any, dbPath, {
    fields: ['description']
  });
};

const { data: page } = await useAsyncData(
  `docs-${route.path}-${locale.value}`,
  async () => {
    let result = await fetchPage(locale.value).catch(() => null);
    if (!result && locale.value !== 'en') {
      result = await fetchPage('en').catch(() => null);
    }
    return result;
  },
  { watch: [() => route.path, locale] }
);

const { data: surround } = await useAsyncData(
  `docs-surround-${route.path}-${locale.value}`,
  async () => {
    let result = await fetchSurround(locale.value).catch(() => null);
    if (!result && locale.value !== 'en') {
      result = await fetchSurround('en').catch(() => null);
    }
    return result;
  },
  { watch: [() => route.path, locale] }
);

// 404 signal on SSR
if (!page.value && import.meta.server) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}

// ── SEO ──────────────────────────────────────────────────
useSeoMeta({
  title: () =>
    page.value?.title
      ? `${page.value.title} — Techknè Docs`
      : 'Documentation — Techknè',
  description: () =>
    page.value?.description ?? 'Documentation officielle du groupe Techknè.',
  ogTitle: () => page.value?.title,
  ogDescription: () => page.value?.description,
});
</script>

<template>
  <div class="page-content animate-fade-in">
    <!-- ── Page found ── -->
    <UPage v-if="page">
      <UPageBody>
        <article class="prose prose-neutral dark:prose-invert max-w-none">
          <!-- Header -->
          <header class="not-prose mb-10">
            <h1 class="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-3">
              {{ page.title }}
            </h1>
            <p v-if="page.description" class="text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {{ page.description }}
            </p>
            <div class="mt-6 h-px bg-neutral-200 dark:bg-neutral-800" />
          </header>

          <!-- Content -->
          <ContentRenderer :value="page" />
        </article>

        <USeparator v-if="surround?.length" class="mt-16" />
        
        <div class="mt-8">
          <UContentSurround :surround="surround" />
        </div>

        <!-- Page footer -->
        <footer class="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 not-prose">
          <p>© {{ new Date().getFullYear() }} Techknè Group. Tous droits réservés.</p>
          <UButton
            v-if="page.path"
            :to="`https://github.com/your-org/techkne/edit/main/content${page.path}.md`"
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

      <template
        v-if="page?.body?.toc?.links?.length"
        #right
      >
        <UContentToc :links="page.body.toc.links" />
      </template>
    </UPage>

    <!-- ── 404 State ── -->
    <div v-else class="flex flex-col items-center justify-center py-32 text-center">
      <div class="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-6">
        <UIcon name="i-lucide-file-question" class="w-10 h-10 text-neutral-400" />
      </div>
      <h1 class="text-3xl font-extrabold mb-3">Page introuvable</h1>
      <p class="text-neutral-500 mb-8 max-w-sm">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <div class="flex items-center gap-3">
        <UButton :to="localePath('/docs')" color="primary" size="lg">
          Voir la documentation
        </UButton>
        <UButton :to="localePath('/')" variant="ghost" color="neutral" size="lg">
          Accueil
        </UButton>
      </div>
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

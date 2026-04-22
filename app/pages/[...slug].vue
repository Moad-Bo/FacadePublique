<script setup lang="ts">
const route = useRoute();
const localePath = useLocalePath();
const { locale } = useI18n();
const notify = useNotify();

// ── Path Resolution ──────────────────────────────────────
const contentPath = computed(() => {
  // If route is /fr/some-page, we strip /fr to get /some-page
  const stripped = route.path.replace(new RegExp(`^/${locale.value}`), '');
  return `${stripped}`.replace(/\/$/, '') || 'index';
});

// ── Data Fetching ────────────────────────────────────────
const fetchPage = (lang: string) => {
  const dbPath = `/${lang}${contentPath.value === 'index' ? '/index' : contentPath.value}`.replace(/\/\//g, '/');
  return queryCollection(`content_${lang}` as any)
    .where('path', '=', dbPath)
    .first();
};

const { data: page, status } = await useAsyncData(
  `catchall-${route.path}-${locale.value}`,
  async () => {
    let result = await fetchPage(locale.value).catch(() => null);
    if (!result && locale.value !== 'en') {
      result = await fetchPage('en').catch(() => null);
    }
    return result;
  },
  { watch: [() => route.path, locale] }
);

// ── Redirection Logic (Client-side only) ────────────────
onMounted(() => {
  // If no content is found and fetching is done
  if (!page.value && status.value !== 'pending') {
    const pathSegments = route.path.split('/').filter(Boolean);
    
    let targetPath = '/';
    if (pathSegments.length > 1) {
      targetPath = '/' + pathSegments.slice(0, -1).join('/');
    }

    // Trigger Notification
    notify.warning(
      'Page non trouvée', 
      `La page "${route.path}" n'existe pas. Vous avez été redirigé vers ${targetPath === '/' ? "l'accueil" : targetPath}.`, 
      5000
    );

    // Perform Redirection
    navigateTo(targetPath, { replace: true });
  }
});

// ── SEO ──────────────────────────────────────────────────
useSeoMeta({
  title: () => page.value?.title ?? 'Techknè Group',
  description: () => page.value?.description,
});
</script>

<template>
  <div class="page-catchall min-h-screen">
    <!-- ── Content found ── -->
    <template v-if="page">
      <UContainer>
        <UPage>
          <UPageBody>
            <article class="prose prose-neutral dark:prose-invert max-w-none py-12">
              <ContentRenderer :value="page" />
            </article>
          </UPageBody>
          
          <!-- Optional TOC for content pages -->
          <template v-if="page?.body?.toc?.links?.length" #right>
            <UContentToc :links="page.body.toc.links" />
          </template>
        </UPage>
      </UContainer>
    </template>

    <!-- ── Loading / Redirecting State ── -->
    <template v-else-if="status === 'pending'">
      <div class="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500" />
        <p class="text-xs font-black uppercase tracking-widest text-neutral-400">Chargement du contenu...</p>
      </div>
    </template>

    <!-- ── Fallback redirection (empty while navigating) ── -->
    <template v-else>
      <div class="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <UIcon name="i-lucide-alert-circle" class="w-10 h-10 text-warning-500" />
        <p class="text-xs font-black uppercase tracking-widest text-neutral-400">Redirection...</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-catchall {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>

<script setup lang="ts">
const localePath = useLocalePath();
const { locale } = useI18n();

// Fetch top-level navigation sections for the docs index
const { data: navTree } = await useAsyncData(
  `docs-index-${locale.value}`,
  () => queryCollectionNavigation('docs'),
  { watch: [locale] }
);

const sections = computed(() => {
  const root = navTree.value ?? [];
  const localeNode = root.find((n: any) => n.path === `/${locale.value}`);
  return (localeNode?.children ?? []) as Array<{
    path: string; title: string; children?: Array<{ path: string; title: string }>;
  }>;
});

// Content path → page route helper (same logic as AppSidebar)
const toPagePath = (contentPath: string) => {
  const withoutLocale = contentPath.replace(`/${locale.value}`, '');
  return localePath(`/docs${withoutLocale}`);
};

useSeoMeta({
  title: 'Documentation — Techknè',
  description: 'Centre de documentation officiel du groupe Techknè.',
});
</script>

<template>
  <div class="py-4">
    <!-- Hero -->
    <div class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-3">
        Documentation
      </h1>
      <p class="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl">
        Guides, références et ressources pour prendre en main l'écosystème Techknè.
      </p>
      <div class="mt-6 h-px bg-neutral-200 dark:bg-neutral-800" />
    </div>

    <!-- Sections grid -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <template v-for="section in sections" :key="section.path">
        <NuxtLink
          :to="section.children?.length ? toPagePath(section.children[0].path) : toPagePath(section.path)"
          class="group flex flex-col gap-3 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/10 transition-all"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-500 shrink-0 group-hover:scale-110 transition-transform">
              <UIcon name="i-lucide-book" class="w-5 h-5" />
            </div>
            <h2 class="font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {{ section.title }}
            </h2>
          </div>

          <!-- Sub-pages list preview -->
          <ul v-if="section.children?.length" class="space-y-1 pl-1">
            <li
              v-for="child in section.children.slice(0, 4)"
              :key="child.path"
              class="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 truncate"
            >
              <UIcon name="i-lucide-chevron-right" class="w-3 h-3 shrink-0 text-neutral-300" />
              {{ child.title }}
            </li>
            <li v-if="section.children.length > 4" class="text-xs text-neutral-400 pl-4">
              +{{ section.children.length - 4 }} autres pages
            </li>
          </ul>
        </NuxtLink>
      </template>
    </div>

    <!-- empty state -->
    <div v-if="!sections.length" class="text-center py-24 text-neutral-400">
      <UIcon name="i-lucide-folder-open" class="w-12 h-12 mx-auto mb-4" />
      <p>Aucune section de documentation trouvée.</p>
    </div>
  </div>
</template>

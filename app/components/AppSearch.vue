<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const isOpen = ref(false);
const searchQuery = ref('');
const localePath = useLocalePath();
const { t, locale } = useI18n();
const router = useRouter();

// ── Dynamic indexing via Nuxt Content v3 ──────────────────
// The actual collection names are content_fr and content_en (from content.config.ts)
const collectionName = computed(() => `content_${locale.value}`);

// Fetch ALL pages from the single unified collection
const { data: allPages } = await useAsyncData(
  `search-all-${locale.value}`,
  () => queryCollection(collectionName.value as any)
    .select('path', 'title', 'description')
    .all(),
  { watch: [locale] }
);

// Split into doc pages vs vitrine pages based on path
const docPages = computed(() =>
  allPages.value?.filter(p => p.path?.includes('/docs/')) ?? []
);
const vitrinePages = computed(() =>
  allPages.value?.filter(p => !p.path?.includes('/docs/')) ?? []
);

// ── Search Groups ─────────────────────────────────────────
const groups = computed(() => {
  const allGroups = [];

  // Default Suggestions
  if (!searchQuery.value) {
    allGroups.push({
      id: 'suggestions',
      label: t('search.suggestions'),
      items: [
        { id: 'sol', label: t('nav.solutions'), suffix: 'Hub', icon: 'i-lucide-orbit', onSelect: () => navigateTo(localePath('/solutions/basis')) },
        { id: 'blog', label: t('nav.blog'), suffix: 'Articles', icon: 'i-lucide-newspaper', onSelect: () => navigateTo(localePath('/blog')) },
        { id: 'hc', label: t('nav.help_center'), suffix: 'Support', icon: 'i-lucide-life-buoy', onSelect: () => navigateTo(localePath('/faq')) },
      ]
    });
  }

  // 1. Vitrine Pages (Basis, Syn, FAQ, etc.)
  if (vitrinePages.value?.length) {
    allGroups.push({
      id: 'pages',
      label: t('search.site_services'),
      items: vitrinePages.value.map(p => ({
        id: p.path,
        label: p.title || p.path,
        suffix: p.description || 'Page',
        icon: 'i-lucide-layers',
        onSelect: () => navigateTo(p.path)
      }))
    });
  }

  // 2. Documentation
  if (docPages.value?.length) {
    allGroups.push({
      id: 'docs',
      label: t('search.documentation'),
      items: docPages.value.map(p => ({
        id: p.path,
        label: p.title || p.path,
        suffix: p.description || 'Docs',
        icon: 'i-lucide-book-open',
        onSelect: () => {
          navigateTo(p.path);
        }
      }))
    });
  }

  return allGroups;
});

// ── Keyboard shortcut ─────────────────────────────────────
const onKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    isOpen.value = !isOpen.value;
  }
};

const onSearchOpen = () => { isOpen.value = true; };

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('search:open', onSearchOpen);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('search:open', onSearchOpen);
});
</script>

<template>
  <UModal v-if="isOpen" v-model:open="isOpen">
    <template #content>
      <div class="overflow-hidden rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 shadow-2xl max-w-xl mx-auto w-full">
        <UCommandPalette
          v-model:search-term="searchQuery"
          :placeholder="t('search.placeholder')"
          :groups="groups"
          :fuse="{ resultLimit: 10, fuseOptions: { threshold: 0.3, keys: ['label', 'suffix'] } }"
        />

        <!-- Keyboard hints -->
        <div class="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1"><UKbd size="sm">↑↓</UKbd> {{ t('search.navigate') }}</span>
            <span class="flex items-center gap-1"><UKbd size="sm">↵</UKbd> {{ t('search.open') }}</span>
          </div>
          <span class="flex items-center gap-1"><UKbd size="sm">Esc</UKbd> {{ t('search.close') }}</span>
        </div>
      </div>
    </template>
  </UModal>
</template>

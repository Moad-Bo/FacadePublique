<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const { locale } = useI18n();
const localePath = useLocalePath();
const { session } = useSession();
const route = useRoute();

// ── Mobile drawer ─────────────────────────────────────────
const isOpen = ref(false);
const openDrawer = () => { isOpen.value = true; };
onMounted(()   => window.addEventListener('sidebar:open', openDrawer));
onUnmounted(() => window.removeEventListener('sidebar:open', openDrawer));
watch(() => route.path, () => { isOpen.value = false; });

const hasSubnav = useState('has-subnav', () => false);

// ── Navigation Tree ───────────────────────────────────────
const collection = computed(() => `content_${locale.value}`);
const { data: navTree } = await useAsyncData(
  `sidebar-nav-v5-${locale.value}`,
  () => queryCollectionNavigation(collection.value as any, ['title', 'path', 'position', 'icon'] as any),
  { watch: [locale] }
);

const navigation = computed(() => {
  const tree = navTree.value ?? [];
  // Find the 'docs' node and its children
  const docsNode = tree.find((n: any) => n.path === `/${locale.value}/docs`);
  if (!docsNode?.children) {
    // Fallback: search for top-level nodes if tree is flat
    return tree.filter((n: any) => n.path.startsWith(`/${locale.value}/docs/`));
  }
  return [...docsNode.children].sort((a: any, b: any) => (Number(a.position) || 99) - (Number(b.position) || 99));
});

const isActive = (p: string) => {
  const internalPath = getNormalizedPath(p);
  const resolved = internalPath.replace(/\/index$/, '') || '/';
  return route.path === resolved || route.path.startsWith(resolved + '/');
};

const getNormalizedPath = (p: string) => {
  return p.replace(new RegExp(`^/${locale.value}`), '');
};
</script>

<template>
  <aside
    class="fixed left-0 z-40 w-64 h-[calc(100vh-3rem)]
           flex flex-col overflow-y-auto
           border-r border-neutral-200 dark:border-neutral-800
           bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-sm
           hidden lg:flex transition-all duration-300"
    :class="hasSubnav ? 'top-20' : 'top-12'"
  >
    <!-- Header -->
    <div class="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      <NuxtLink
        :to="localePath('/docs')"
        class="flex items-center gap-2 text-sm font-black text-neutral-700 dark:text-neutral-200"
      >
        <UIcon name="i-lucide-book" class="w-4 h-4 text-primary-500" />
        Documentation
      </NuxtLink>
    </div>

    <!-- Body -->
    <nav class="flex-1 overflow-y-auto px-3 py-5 space-y-5">
      <div v-if="session" class="space-y-1">
        <p class="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">Compte</p>
        <NuxtLink
          :to="localePath('/dashboard')"
          class="nav-link"
          :class="isActive('/dashboard') ? 'nav-link--active' : 'nav-link--idle'"
        >
          <UIcon name="i-lucide-layout-dashboard" class="nav-icon" />
          Dashboard
        </NuxtLink>
      </div>

      <template v-for="section in navigation" :key="section.path">
        <div class="space-y-1">
          <p class="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
            {{ section.title }}
          </p>
          <template v-if="section.children?.length">
            <NuxtLink
              v-for="child in section.children"
              :key="child.path"
              :to="localePath(getNormalizedPath(child.path))"
              class="nav-link"
              :class="isActive(child.path) ? 'nav-link--active' : 'nav-link--idle'"
            >
              <UIcon :name="(child as any).icon || (isActive(child.path) ? 'i-lucide-book-open' : 'i-lucide-file-text')" class="nav-icon" />
              <span class="truncate">{{ child.title }}</span>
            </NuxtLink>
          </template>
          <NuxtLink
            v-else
            :to="localePath(getNormalizedPath(section.path))"
            class="nav-link"
            :class="isActive(section.path) ? 'nav-link--active' : 'nav-link--idle'"
          >
            <UIcon :name="(section as any).icon || (isActive(section.path) ? 'i-lucide-book-open' : 'i-lucide-file-text')" class="nav-icon" />
            <span class="truncate">{{ section.title }}</span>
          </NuxtLink>
        </div>
      </template>
    </nav>

    <!-- Footer -->
    <div class="shrink-0 px-5 py-4 border-t border-neutral-200 dark:border-neutral-800">
      <a href="https://github.com" target="_blank" class="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-primary-500">
        <UIcon name="i-lucide-github" class="w-4 h-4" />
        GitHub
      </a>
    </div>
  </aside>

  <!-- Mobile Drawer -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm lg:hidden" @click="isOpen = false" />
    </Transition>
    <Transition name="slide">
      <div v-if="isOpen" class="fixed top-0 left-0 z-[81] w-72 max-w-[85vw] h-full flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 lg:hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <NuxtLink :to="localePath('/docs')" class="flex items-center gap-2 text-sm font-bold" @click="isOpen = false">
            <UIcon name="i-lucide-book" class="w-4 h-4 text-primary-500" />
            Documentation
          </NuxtLink>
          <UButton square variant="ghost" color="neutral" icon="i-lucide-x" size="sm" @click="isOpen = false" />
        </div>
        <nav class="flex-1 overflow-y-auto px-4 py-6">
          <div class="space-y-6">
            <template v-for="section in navigation" :key="`m-${section.path}`">
              <div class="space-y-1">
                <p class="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {{ section.title }}
                </p>
                <template v-if="section.children?.length">
                  <NuxtLink
                    v-for="child in section.children"
                    :key="`m-${child.path}`"
                    :to="localePath(getNormalizedPath(child.path))"
                    class="nav-link"
                    :class="isActive(child.path) ? 'nav-link--active' : 'nav-link--idle'"
                    @click="isOpen = false"
                  >
                    <UIcon :name="(child as any).icon || (isActive(child.path) ? 'i-lucide-book-open' : 'i-lucide-file-text')" class="nav-icon" />
                    <span class="truncate">{{ child.title }}</span>
                  </NuxtLink>
                </template>
                <NuxtLink
                  v-else
                  :to="localePath(getNormalizedPath(section.path))"
                  class="nav-link"
                  :class="isActive(section.path) ? 'nav-link--active' : 'nav-link--idle'"
                  @click="isOpen = false"
                >
                  <UIcon :name="(section as any).icon || (isActive(section.path) ? 'i-lucide-book-open' : 'i-lucide-file-text')" class="nav-icon" />
                  <span class="truncate">{{ section.title }}</span>
                </NuxtLink>
              </div>
            </template>
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  min-height: 2.5rem;
}
.nav-link--active {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
}
.dark .nav-link--active {
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.05);
}
.nav-link--idle {
  color: #525252;
}
.dark .nav-link--idle {
  color: #a3a3a3;
}
.nav-link--idle:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #171717;
}
.dark .nav-link--idle:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
}

.nav-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}
</style>

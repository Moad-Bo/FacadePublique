<script setup lang="ts">
const localePath = useLocalePath();

const { data: categories } = await useFetch('/api/community/categories');

const staticLinks = [
  { label: 'Toutes les discussions', icon: 'i-lucide-list', to: '/forum' },
  { label: 'Trending', icon: 'i-lucide-trending-up', to: '/forum?sort=trending' },
  { label: 'Non résolus', icon: 'i-lucide-circle-help', to: '/forum?status=unresolved' }
];
</script>

<template>
  <aside class="w-64 hidden lg:flex flex-col gap-8 shrink-0 py-6 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto no-scrollbar">
    <!-- Main Navigation -->
    <nav class="flex flex-col gap-1">
      <ULink
        v-for="link in staticLinks"
        :key="link.label"
        :to="localePath(link.to)"
        class="flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
        active-class="bg-primary-500/10 text-primary-600 dark:text-primary-400"
      >
        <UIcon :name="link.icon" class="w-4 h-4" />
        {{ link.label }}
      </ULink>
    </nav>

    <!-- Categories Section -->
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between px-3">
        <span class="text-[10px] font-black uppercase tracking-widest text-neutral-400">Catégories</span>
        <UButton variant="ghost" color="neutral" icon="i-lucide-settings" size="xs" class="opacity-0 group-hover:opacity-100" />
      </div>

      <nav class="flex flex-col gap-1">
        <ULink
          v-for="cat in categories"
          :key="cat.id"
          :to="localePath(`/forum/category/${cat.slug}`)"
          class="group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          active-class="bg-neutral-100 dark:bg-neutral-800 text-primary-500"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-2 h-2 rounded-full shrink-0" 
              :style="{ backgroundColor: cat.color }"
            />
            <span class="truncate">{{ cat.name }}</span>
          </div>
          <UBadge v-if="cat.topicCount" size="xs" color="neutral" variant="soft" class="text-[9px] opacity-70">
            {{ cat.topicCount }}
          </UBadge>
        </ULink>
      </nav>
    </div>

    <!-- Help Card -->
    <div class="mt-auto px-3">
      <div class="p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/10 overflow-hidden relative group">
        <div class="absolute -right-4 -top-4 w-20 h-20 bg-primary-500/20 blur-2xl group-hover:bg-primary-500/30 transition-all" />
        <h4 class="text-xs font-bold mb-1">Besoin d'aide ?</h4>
        <p class="text-[10px] text-neutral-500 leading-relaxed mb-3">Consultez notre documentation avant de poster !</p>
        <UButton to="/docs" label="Voir la Doc" size="xs" variant="solid" block />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

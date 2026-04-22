<script setup lang="ts">
definePageMeta({
  layout: 'forum'
});

const route = useRoute();
const slug = computed(() => route.params.slug as string);

// Mock data for Category Info
const { data: category } = await useFetch(`/api/forum/categories/${slug.value}`, {
  default: () => ({
    name: slug.value.charAt(0).toUpperCase() + slug.value.slice(1),
    description: 'Toutes les discussions liées à ' + slug.value + '.',
    color: '#3b82f6',
    icon: 'i-lucide-message-square'
  })
});

// Mock data for Category Threads
const { data: threads } = await useFetch(`/api/forum/threads?category=${slug.value}`, {
  default: () => [
    {
      id: '1',
      title: 'Comment configurer l\'authentification avec Better Auth dans Nuxt ?',
      slug: 'comment-configurer-auth',
      author: { name: 'Moad', image: 'https://github.com/moadbo.png' },
      category: { name: category.value.name, slug: slug.value, color: category.value.color },
      replies: 12,
      upvotes: 45,
      downvotes: 2,
      isResolved: true,
      isPinned: true,
      createdAt: new Date().toISOString()
    }
  ]
});
</script>

<template>
  <div class="space-y-10 pb-20">
    <!-- Category Header -->
    <section class="p-8 rounded-3xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 relative overflow-hidden">
       <div class="absolute -right-8 -bottom-8 opacity-10 blur-xl">
          <UIcon :name="category.icon" class="w-48 h-48" :style="{ color: category.color }" />
       </div>
       
       <div class="relative z-10 flex items-center gap-6">
          <div 
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
            :style="{ backgroundColor: category.color }"
          >
             <UIcon :name="category.icon" class="w-8 h-8" />
          </div>
          
          <div class="flex-1 space-y-2">
             <div class="flex items-center gap-2">
                <UBadge variant="subtle" color="neutral" class="text-[9px] font-black uppercase tracking-widest">Catégorie</UBadge>
                <h1 class="text-3xl font-black tracking-tighter uppercase">{{ category.name }}</h1>
             </div>
             <p class="text-neutral-500 font-medium max-w-xl">{{ category.description }}</p>
          </div>
          
          <div class="hidden md:flex gap-2">
             <UButton label="S'abonner" icon="i-lucide-bell" color="neutral" variant="outline" size="sm" />
             <UButton to="/forum/new" label="Nouvelle Question" icon="i-lucide-plus" size="sm" variant="solid" />
          </div>
       </div>
    </section>

    <!-- Category Threads -->
    <section class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-4">
           <h2 class="text-xs font-black tracking-widest uppercase text-neutral-400">Filtré par : {{ category.name }}</h2>
           <div class="flex items-center gap-1">
              <UButton label="Top" color="neutral" size="xs" variant="ghost" icon="i-lucide-arrow-up-wide-narrow" />
              <UButton label="Plus récent" color="neutral" size="xs" variant="ghost" icon="i-lucide-calendar" />
           </div>
        </div>
        <UButton variant="ghost" color="neutral" icon="i-lucide-filter" size="sm" class="md:hidden" />
      </div>

      <div class="grid grid-cols-1 gap-3">
        <ThreadCard 
          v-for="thread in threads" 
          :key="thread.id" 
          :thread="thread" 
        />
        
        <div v-if="threads.length === 0" class="py-20 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
           <UIcon name="i-lucide-inbox" class="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
           <p class="text-neutral-500 font-bold">Aucune discussion dans cette catégorie.</p>
        </div>
      </div>

      <div class="flex justify-center pt-8">
        <UPagination :total="50" size="sm" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
interface Thread {
  id: string;
  title: string;
  slug: string;
  author: {
    name: string;
    image?: string;
  };
  category: {
    name: string;
    slug: string;
    color: string;
  };
  replies: number;
  upvotes: number;
  downvotes: number;
  isResolved: boolean;
  isPinned: boolean;
  createdAt: string;
}

defineProps<{
  thread: Thread;
}>();

const localePath = useLocalePath();
</script>

<template>
  <div class="group relative flex items-start gap-4 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5 hover:border-primary-500/20">
    <!-- Pinned Indicator -->
    <div v-if="thread.isPinned" class="absolute -left-1 -top-1">
      <div class="p-1 rounded-md bg-amber-500 text-white shadow-sm flex items-center justify-center">
        <UIcon name="i-lucide-pin" class="w-3 h-3" />
      </div>
    </div>

    <!-- Vote Column -->
    <div class="hidden sm:flex flex-col items-center gap-1 min-w-[3rem] px-1 py-1 rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
       <UButton icon="i-lucide-chevron-up" variant="ghost" color="neutral" size="xs" class="hover:text-primary-500" />
       <span class="text-xs font-black tracking-tighter">{{ thread.upvotes - thread.downvotes }}</span>
       <UButton icon="i-lucide-chevron-down" variant="ghost" color="neutral" size="xs" class="hover:text-error-500" />
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1 flex-wrap">
        <NuxtLink 
          :to="localePath(`/forum/category/${thread.category.slug}`)"
          class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors"
        >
          {{ thread.category.name }}
        </NuxtLink>
        <span class="text-[10px] text-neutral-400 font-medium">{{ formatDate(thread.createdAt) }}</span>
      </div>

      <NuxtLink :to="localePath(`/forum/thread/${thread.id}`)" class="block">
        <h3 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-500 transition-colors line-clamp-1 mb-1 leading-tight">
          {{ thread.title }}
        </h3>
      </NuxtLink>

      <div class="flex items-center gap-4 mt-2">
        <!-- Author Info -->
        <NuxtLink :to="localePath(`/forum/user/${thread.author.name}`)" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
           <UAvatar :src="thread.author.image" :alt="thread.author.name" size="2xs" />
           <span class="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">{{ thread.author.name }}</span>
        </NuxtLink>

        <!-- Stats -->
        <div class="flex items-center gap-3 ml-auto text-neutral-400">
          <div class="flex items-center gap-1">
             <UIcon name="i-lucide-message-circle" class="w-3.5 h-3.5" />
             <span class="text-[10px] font-bold">{{ thread.replies }}</span>
          </div>
          <div v-if="thread.isResolved" class="flex items-center gap-1 text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
             <UIcon name="i-lucide-check-circle-2" class="w-3.5 h-3.5" />
             <span class="text-[10px] font-black uppercase tracking-tighter">Résolu</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom animations or styles if needed */
</style>

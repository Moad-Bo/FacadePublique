<script setup lang="ts">
/**
 * ThreadCard Component
 * Displays a summary of a forum thread.
 */
const props = defineProps<{
  thread: {
    id: string
    title: string
    slug: string
    content: string
    createdAt: string | Date
    views: number
    upvotes: number
    author: {
      name: string
      image?: string
      role?: string
      createdAt: string | Date
      emailVerified?: boolean
    }
    category: {
      name: string
      color: string
      icon: string
    }
  }
}>()

const localePath = useLocalePath()

// Format date to "2d ago" etc.
const timeAgo = (date: string | Date) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<template>
  <NuxtLink 
    :to="localePath(`/forum/thread/${thread.slug}`)"
    class="flex flex-col gap-4 p-5 rounded-3xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white/50 dark:bg-neutral-900/50 hover:border-primary-500/30 hover:bg-white dark:hover:bg-neutral-900 transition-all group"
  >
    <!-- Card Header: Category & Meta -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UBadge :color="thread.category.color as any" variant="soft" size="xs" class="rounded-full px-2 py-0 font-bold uppercase text-[10px]">

          <UIcon :name="thread.category.icon" class="mr-1 w-3 h-3" />
          {{ thread.category.name }}
        </UBadge>
        <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{{ timeAgo(thread.createdAt) }}</span>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1 text-neutral-400 group-hover:text-primary-500 transition-colors">
          <UIcon name="i-lucide-arrow-big-up" class="w-4 h-4" />
          <span class="text-xs font-black">{{ thread.upvotes }}</span>
        </div>
        <div class="flex items-center gap-1 text-neutral-400">
          <UIcon name="i-lucide-eye" class="w-4 h-4" />
          <span class="text-xs font-bold">{{ thread.views }}</span>
        </div>
      </div>
    </div>

    <!-- Title & Content Preview -->
    <div class="space-y-1">
      <h3 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-primary-500 transition-colors">
        {{ thread.title }}
      </h3>
      <p class="text-sm text-neutral-500 line-clamp-1 font-medium">
        {{ thread.content.replace(/<[^>]*>?/gm, '').substring(0, 150) }}...
      </p>
    </div>

    <!-- Author Info & Badges -->
    <div class="flex items-center justify-between mt-1 pt-4 border-t border-neutral-100 dark:border-neutral-800/50">
       <div class="flex items-center gap-2">
          <UAvatar 
            :src="thread.author.image" 
            :alt="thread.author.name" 
            size="xs" 
            class="ring-2 ring-transparent group-hover:ring-primary-500/20 transition-all"
          />
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-neutral-900 dark:text-neutral-200">{{ thread.author.name }}</span>
              <!-- USER BADGES INTEGRATION -->
              <forum-user-badge :user="thread.author" />
            </div>
          </div>
       </div>
       
       <UButton 
         variant="ghost" 
         color="neutral" 
         icon="i-lucide-chevron-right" 
         size="xs" 
         class="rounded-full opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" 
       />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  page?: any
}>()

const { isMember, checkMembership } = useCommunity()

onMounted(checkMembership)

const showComments = computed(() => props.page?.comments !== false)
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-900">
    <!-- Header Carousel -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
       <!-- <BlogLatestCarousel /> -->
    </div>

    <!-- Main Content Grid -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
       <div class="flex flex-col lg:flex-row gap-16">
          
          <!-- Post Content -->
          <article class="flex-1 min-w-0">
             <!-- Metadata Header -->
             <div class="mb-12">
                <div class="flex items-center gap-4 text-xs font-medium text-dimmed uppercase tracking-widest mb-4">
                   <span>{{ page?.category || 'Expertise' }}</span>
                   <span class="size-1 rounded-full bg-default" />
                   <span>{{ page?.date ? new Date(page.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '' }}</span>
                </div>
                <h1 class="text-4xl md:text-6xl font-black italic tracking-tighter text-highlighted leading-none mb-8">
                  {{ page?.title }}
                </h1>
                <p class="text-xl text-dimmed leading-relaxed font-medium">
                  {{ page?.description }}
                </p>
             </div>

             <!-- Markdown Body -->
             <div class="prose prose-neutral dark:prose-invert max-w-none 
                         prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter 
                         prose-h2:text-3xl prose-h2:border-b prose-h2:border-default prose-h2:pb-4 prose-h2:mt-16
                         prose-p:text-lg prose-p:leading-relaxed prose-p:font-medium
                         prose-img:rounded-[2rem] prose-img:shadow-2xl">
                <slot />
             </div>

             <!-- Interaction Section -->
             <BlogInteraction 
               :topic-id="page?.path || ''" 
               :title="page?.title || ''" 
               :enable-comments="showComments" 
             />
          </article>

          <!-- Sidebar (On this page) -->
          <aside class="hidden lg:block w-72 shrink-0">
             <div class="sticky top-24 space-y-8">
                <div v-if="page?.body?.toc?.links?.length" class="p-8 rounded-[2rem] bg-neutral-50 dark:bg-neutral-800/30 border border-default shadow-sm">
                   <UContentToc :links="page.body.toc.links" title="On this page" highlight />
                </div>

                <!-- Related or Newsletter Sub -->
                <div class="p-8 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-sm overflow-hidden relative group">
                   <div class="relative z-10">
                      <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Newsletter</h4>
                      <p class="text-xs font-bold leading-relaxed mb-6">Restez à la pointe de l'innovation Techknè.</p>
                      <UInput placeholder="votre@email.com" class="mb-4 rounded-xl" />
                      <UButton label="S'abonner" color="primary" block size="sm" class="rounded-xl font-bold" />
                   </div>
                   <UIcon name="i-lucide:megaphone" class="absolute -right-4 -bottom-4 size-24 opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                </div>
             </div>
          </aside>

       </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth scroll behavior for TOC */
html {
  scroll-behavior: smooth;
}
</style>

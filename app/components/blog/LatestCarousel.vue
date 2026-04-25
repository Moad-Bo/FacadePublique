<script setup lang="ts">
const { locale } = useI18n()

// Fetch 5 latest blog posts from the locale-specific collection
const collectionName = computed(() => `content_${locale.value}`)
const { data: posts } = await useAsyncData('latest-blog-posts', () => 
  queryCollection(collectionName.value as any)
    .where('path', 'LIKE', `/${locale.value}/blog/%`)
    .order('date', 'DESC')
    .limit(5)
    .all()
)

// Carousel configuration
const config = {
  autoplay: 8000,
  wrapAround: true,
  pauseAutoplayOnHover: true,
  transition: 800
}
</script>

<template>
  <div v-if="posts && posts.length > 0" class="carousel-container group relative">
    <Carousel v-bind="config" class="rounded-[2.5rem] overflow-hidden border border-default shadow-2xl bg-neutral-900">
      <Slide v-for="post in posts" :key="post.path">
        <div class="relative w-full aspect-[21/9]">
           <!-- Background Overlay / Image -->
           <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
           <img v-if="post.image" :src="post.image" class="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:scale-105 transition-transform duration-[2000ms]" />
           <div v-else class="absolute inset-0 bg-gradient-to-br from-primary/20 to-neutral-800" />

           <!-- Content -->
           <div class="absolute inset-0 z-20 p-12 flex flex-col justify-end text-left max-w-2xl">
              <UBadge :label="post.category || 'Actualité'" color="primary" variant="subtle" size="xs" class="w-fit mb-4 font-black tracking-widest uppercase" />
              <h2 class="text-3xl md:text-5xl font-black text-white italic leading-tight mb-4">
                {{ post.title }}
              </h2>
              <p class="text-white/70 line-clamp-2 text-sm font-medium mb-6">
                {{ post.description }}
              </p>
              <UButton :to="post.path" label="Lire l'article" icon="i-lucide:arrow-right" trailing color="primary" variant="solid" size="lg" class="w-fit rounded-2xl px-6 font-bold shadow-xl shadow-primary/20" />
           </div>
        </div>
      </Slide>

      <template #addons>
        <Navigation />
        <Pagination />
      </template>
    </Carousel>
  </div>
</template>

<style scoped>
:deep(.carousel__prev),
:deep(.carousel__next) {
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  margin: 0 2rem;
  color: white;
  transition: all 0.3s ease;
}

:deep(.carousel__prev:hover),
:deep(.carousel__next:hover) {
  background-color: var(--ui-primary);
  transform: scale(1.1);
}

:deep(.carousel__pagination) {
  position: absolute;
  bottom: 3rem;
  right: 3rem;
  padding: 0;
  margin: 0;
  z-index: 30;
}

:deep(.carousel__pagination-button::after) {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
}

:deep(.carousel__pagination-button--active::after) {
  width: 24px;
  border-radius: 10px;
  background-color: var(--ui-primary);
}
</style>

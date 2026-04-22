<script setup lang="ts">
definePageMeta({
  layout: 'forum'
});

const localePath = useLocalePath();

const { data: threads, status } = await useAsyncData(
  'forum-threads',
  () => $fetch('/api/forum/threads')
);

const searchQuery = ref('');
</script>

<template>
  <div class="space-y-12 pb-20">
    <!-- Hero Section -->
    <section class="relative py-16 px-8 rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 flex flex-col items-center text-center">
      <!-- Background Effects -->
      <div class="absolute inset-0 z-0">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div class="relative z-10 max-w-2xl mx-auto space-y-6">
        <UBadge variant="soft" color="primary" class="font-black tracking-widest uppercase text-[10px] px-3">
          Techknè Community Hub
        </UBadge>
        <h1 class="text-4xl md:text-5xl font-black tracking-tighter text-white leading-[0.9]">
          Comment pouvons-nous <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">vous aider aujourd'hui ?</span>
        </h1>
        <p class="text-neutral-400 text-sm md:text-base font-medium leading-relaxed">
          Recherchez parmi nos discussions, tutoriels et questions fréquentes pour trouver des solutions rapides à vos défis techniques.
        </p>

        <!-- Global Search Bar -->
        <div class="relative group max-w-lg mx-auto w-full mt-8">
          <div class="absolute -inset-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition-opacity" />
          <div class="relative flex items-center bg-white dark:bg-neutral-800 rounded-xl px-4 py-3 shadow-xl">
             <UIcon name="i-lucide-search" class="w-5 h-5 text-neutral-400 mr-3" />
             <input 
               v-model="searchQuery"
               type="text" 
               placeholder="Rechercher une discussion, un tag, un utilisateur..." 
               class="bg-transparent border-none focus:ring-0 flex-1 text-sm font-medium outline-none"
             />
             <div class="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-[10px] font-black text-neutral-400 select-none">
               <span>⌘</span>
               <span>K</span>
             </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Sections Entry Points -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
      <UCard 
        class="group cursor-pointer border-neutral-200/60 dark:border-neutral-800/60 hover:border-primary-500/50 transition-all rounded-[2rem] overflow-hidden"
        @click="navigateTo('/forum/help')"
      >
        <div class="flex items-center gap-5">
           <div class="size-14 rounded-2xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors duration-500 shadow-inner">
              <UIcon name="i-lucide-life-buoy" class="w-7 h-7" />
           </div>
           <div class="flex flex-col">
              <h3 class="font-black text-lg tracking-tight uppercase">Help Center</h3>
              <p class="text-xs text-neutral-500 font-medium">Assistance technique, FAQ et entraide.</p>
           </div>
        </div>
      </UCard>

      <UCard 
        class="group cursor-pointer border-neutral-200/60 dark:border-neutral-800/60 hover:border-purple-500/50 transition-all rounded-[2rem] overflow-hidden"
        @click="navigateTo('/forum/social')"
      >
        <div class="flex items-center gap-5">
           <div class="size-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors duration-500 shadow-inner">
              <UIcon name="i-lucide-users" class="w-7 h-7" />
           </div>
           <div class="flex flex-col">
              <h3 class="font-black text-lg tracking-tight uppercase">Community Social</h3>
              <p class="text-xs text-neutral-500 font-medium">Actualités, Roadmap et discussions libres.</p>
           </div>
        </div>
      </UCard>
    </section>

    <!-- Discussions List -->
    <section class="space-y-6">
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-4">
           <h2 class="text-xl font-black tracking-tight uppercase">Discussions récentes</h2>
           <div class="hidden sm:flex items-center gap-1">
              <UButton label="Latest" variant="soft" color="primary" size="xs" />
              <UButton label="Trending" variant="ghost" color="neutral" size="xs" />
              <UButton label="Unresolved" variant="ghost" color="neutral" size="xs" />
           </div>
        </div>
        <UButton to="/forum/new" label="Poser une question" icon="i-lucide-plus" size="sm" variant="solid" />
      </div>


      <div class="grid grid-cols-1 gap-3">
        <ThreadCard 
          v-for="thread in threads" 
          :key="thread.id" 
          :thread="thread" 
        />
        
        <div v-if="threads.length === 0" class="py-20 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
           <UIcon name="i-lucide-inbox" class="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
           <p class="text-neutral-500 font-bold">Aucune discussion trouvée.</p>
           <p class="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Soyez le premier à poser une question !</p>
        </div>
      </div>

      <div class="flex justify-center pt-8">
        <UPagination :total="100" show-first show-last size="sm" />
      </div>
    </section>
  </div>
</template>

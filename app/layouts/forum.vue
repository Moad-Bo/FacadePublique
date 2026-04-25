<script setup lang="ts">
const hasSubnav = useState('has-subnav', () => false);
onMounted(() => {
  hasSubnav.value = false; // Reset subnav for forum layout
});
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-primary-500/30">
    <!-- Community Header -->
    <CommunityHeader />

    <div class="container mx-auto px-4 md:px-6">
      <div class="flex gap-8 min-h-[calc(100vh-3.5rem)]">
        <!-- Sidebar -->
        <CommunitySidebar />

        <!-- Main Content -->
        <main class="flex-1 min-w-0 py-6">
          <slot />
        </main>

        <!-- Right Sidebar (Optional for MVP, could use for Stats/Recent) -->
        <div class="hidden xl:flex w-72 flex-col gap-8 py-6 sticky top-14 h-fit">
           <div class="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
             <h3 class="text-xs font-black uppercase tracking-widest mb-4">Statistiques</h3>
             <div class="space-y-4">
                <div class="flex justify-between items-center">
                   <span class="text-xs text-neutral-500">Membres</span>
                   <span class="text-sm font-bold tracking-tighter">1,248</span>
                </div>
                <div class="flex justify-between items-center">
                   <span class="text-xs text-neutral-500">Discussions</span>
                   <span class="text-sm font-bold tracking-tighter">856</span>
                </div>
                <div class="flex justify-between items-center">
                   <span class="text-xs text-neutral-500">En ligne</span>
                   <div class="flex items-center gap-1.5">
                      <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span class="text-sm font-bold tracking-tighter">42</span>
                   </div>
                </div>
             </div>
           </div>
           
           <div class="flex flex-col gap-2">
             <span class="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Top Contributeurs</span>
             <div v-for="i in 3" :key="i" class="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer">
                <UAvatar size="sm" alt="User" />
                <div class="flex flex-col">
                   <span class="text-xs font-bold">Nicolas</span>
                   <span class="text-[10px] text-neutral-500 font-medium">12 solutions</span>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>

    <!-- IA Assistant (inherited from global config) -->
    <AssistantChat v-if="$config.public.assistant?.enabled" />
  </div>
</template>

<style>
/* Smooth typography and layout transitions */
.page-enter-active, .page-leave-active {
  transition: all 0.2s ease;
}
.page-enter-from, .page-leave-to {
  opacity: 0;
  filter: blur(4px);
  transform: translateY(4px);
}
</style>

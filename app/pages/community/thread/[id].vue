<script setup lang="ts">
definePageMeta({
  layout: 'forum'
});

const route = useRoute();
const localePath = useLocalePath();
const id = computed(() => route.params.id as string);

const { session } = useSession();
const { formatDate, isMember, checkMembership } = useCommunity();

// ── Data Fetching ────────────────────────────────────────
const { data: threadData, status } = await useAsyncData(
  `thread-${id.value}`,
  () => $fetch(`/api/community/topics/${id.value}`)
);

const thread = computed(() => threadData.value?.thread);
const replies = computed(() => threadData.value?.replies || []);

const newReply = ref('');
const sending = ref(false);

const handlePostReply = async () => {
  if (!isMember.value) return;
  sending.value = true;
  try {
    await $fetch('/api/community/replies', {
      method: 'POST',
      body: { topicId: id.value, content: newReply.value }
    });
    newReply.value = '';
    refreshNuxtData(`thread-${id.value}`);
  } catch (e) {
    console.error('Failed to post reply:', e);
  } finally {
    sending.value = false;
  }
};

const handleVote = async (type: 'up' | 'down', targetId: string, isTopic: boolean) => {
  if (!isMember.value) return;
  
  const target = isTopic ? thread.value : replies.value.find((r: any) => r.id === targetId);
  if (!target) return;

  // Optimistic UI
  const originalUp = target.upvotes;
  const originalDown = target.downvotes;
  
  if (type === 'up') target.upvotes++;
  else target.downvotes++;

  try {
    await $fetch('/api/community/votes', {
      method: 'POST',
      body: { [isTopic ? 'topicId' : 'replyId']: targetId, type }
    });
  } catch (e) {
    // Revert on error
    target.upvotes = originalUp;
    target.downvotes = originalDown;
    console.error('Vote failed:', e);
  }
};

onMounted(() => {
  checkMembership();
});

</script>

<template>
  <div class="space-y-8 pb-20">
    <!-- Thread Header -->
    <section class="space-y-4">
      <div class="flex items-center gap-2">
         <NuxtLink :to="localePath(`/forum/category/${thread.category.slug}`)" class="text-xs font-black uppercase tracking-widest text-primary-500 hover:opacity-80">
            {{ thread.category.name }}
         </NuxtLink>
         <span class="text-neutral-400">/</span>
         <span class="text-xs text-neutral-500 font-medium">{{ formatDate(thread.createdAt) }}</span>
      </div>
      
      <div class="flex items-start justify-between gap-6">
         <h1 class="text-3xl md:text-4xl font-black tracking-tighter leading-tight text-neutral-900 dark:text-neutral-100">
            {{ thread.title }}
         </h1>
         <div v-if="thread.isResolved" class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 shadow-sm shadow-green-500/5 sm:mt-1.5">
            <UIcon name="i-lucide-check-circle-2" class="w-4 h-4" />
            <span class="text-[10px] font-black uppercase tracking-widest">Résolu</span>
         </div>
      </div>
    </section>

    <!-- Main Thread Content -->
    <section class="flex gap-6 items-start">
       <!-- Author Sidebar -->
       <div class="hidden md:flex flex-col items-center gap-4 w-20 shrink-0">
          <UAvatar :src="thread.author.image" :alt="thread.author.name" size="lg" class="ring-2 ring-primary-500/10 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950" />
          <div class="flex flex-col items-center gap-1">
             <span class="text-[10px] font-black uppercase tracking-tighter text-neutral-900 dark:text-neutral-100">{{ thread.author.name }}</span>
             <UBadge v-if="thread.author.role" size="xs" variant="soft" color="primary" class="text-[8px] font-black px-2 uppercase tracking-widest">{{ thread.author.role }}</UBadge>
          </div>
       </div>

       <!-- Post Content Card -->
       <div class="flex-1 min-w-0 p-6 md:p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white dark:bg-neutral-900/40 relative">
          <!-- Upvote/Downvote Column (Floating on Thread) -->
          <div class="absolute -left-4 top-8 flex flex-col items-center gap-2 px-1.5 py-2 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-xl shadow-primary-500/5 z-10 transition-transform hover:scale-105">
             <UButton icon="i-lucide-chevron-up" color="neutral" variant="ghost" size="xs" class="hover:text-primary-500" @click="handleVote('up', thread.id, true)" />
             <span class="text-[11px] font-black tracking-tighter">{{ thread.upvotes - thread.downvotes }}</span>
             <UButton icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" class="hover:text-error-500" @click="handleVote('down', thread.id, true)" />
          </div>

          <article class="prose dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-a:text-primary-500 prose-code:text-primary-500 prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800">
             {{ thread.content }}
          </article>

          <!-- Footer Actions -->
          <div class="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
             <div class="flex gap-2">
                <UButton icon="i-lucide-share-2" color="neutral" variant="ghost" size="xs" class="text-neutral-400" />
                <UButton icon="i-lucide-flag" color="neutral" variant="ghost" size="xs" class="text-neutral-400" />
             </div>
             <UButton label="Répondre" icon="i-lucide-corner-down-left" size="sm" variant="soft" />
          </div>
       </div>
    </section>

    <!-- Replies Section -->
    <section class="space-y-6 mt-12">
       <div class="flex items-center justify-between px-2">
          <h3 class="text-xl font-black uppercase tracking-tighter">{{ replies.length }} Réponses</h3>
          <USelect :items="['Plus récents', 'Plus votés']" size="sm" class="w-32" />
       </div>

       <div class="space-y-4">
          <div 
            v-for="reply in replies" 
            :key="reply.id"
            class="flex gap-6 items-start group"
          >
             <!-- Author Sidebar -->
             <div class="hidden md:flex flex-col items-center gap-2 w-12 shrink-0 pt-4">
                <UAvatar :src="reply.author.image" :alt="reply.author.name" size="sm" />
                <div 
                  class="flex flex-col items-center gap-1.5 py-1 px-1 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50 dark:bg-neutral-900 group-hover:bg-primary-500/5 group-hover:border-primary-500/20 transition-all"
                >
                   <UButton icon="i-lucide-chevron-up" variant="ghost" color="neutral" size="xs" class="text-[8px] hover:text-primary-500" @click="handleVote('up', reply.id, false)" />
                   <span class="text-[9px] font-black tracking-tighter">{{ reply.upvotes - reply.downvotes }}</span>
                   <UButton icon="i-lucide-chevron-down" variant="ghost" color="neutral" size="xs" class="text-[8px] hover:text-error-500" @click="handleVote('down', reply.id, false)" />
                </div>
             </div>

             <!-- Reply Content -->
             <div 
               class="flex-1 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900/20 transition-all hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 relative"
               :class="reply.isSolution ? 'border-green-500/30 bg-green-500/5 dark:bg-green-500/5 ring-1 ring-green-500/20' : ''"
             >
                <!-- Solution Badge -->
                <div v-if="reply.isSolution" class="absolute -right-3 -top-3">
                   <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 scale-100 group-hover:scale-105 transition-transform">
                      <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" />
                      Solution
                   </div>
                </div>

                <div class="flex items-center gap-2 mb-3 md:hidden">
                   <UAvatar :src="reply.author.image" size="xs" />
                   <span class="text-xs font-bold">{{ reply.author.name }}</span>
                   <span class="text-[10px] text-neutral-500 ml-auto">{{ formatDate(reply.createdAt) }}</span>
                </div>

                <article class="prose dark:prose-invert prose-sm max-w-none">
                   {{ reply.content }}
                </article>

                <div class="mt-6 flex items-center justify-between">
                   <span class="hidden md:inline text-[10px] text-neutral-400 font-medium">Répondu le {{ formatDate(reply.createdAt) }}</span>
                   <div class="flex gap-4">
                      <UButton label="Utile" icon="i-lucide-thumbs-up" variant="ghost" color="neutral" size="xs" class="group-hover:text-primary-400" />
                      <UButton v-if="!reply.isSolution" label="C'est la solution" icon="i-lucide-check-circle" variant="ghost" color="success" size="xs" />
                   </div>
                </div>
             </div>
          </div>
       </div>
    </section>

    <!-- Reply Editor or Membership CTA -->
    <section v-if="thread" class="pt-12">
       <div v-if="isMember" class="p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div class="flex items-center gap-4 mb-6">
             <h3 class="text-xl font-black uppercase tracking-tighter">Votre réponse</h3>
             <span class="text-xs text-neutral-500 font-medium">Éditeur Markdown activé</span>
          </div>
          
          <div class="space-y-4">
             <UTextarea 
               v-model="newReply" 
               placeholder="Partagez votre expertise ici..." 
               variant="outline" 
               :rows="8" 
               class="font-medium"
               :ui="{ base: 'rounded-2xl bg-white dark:bg-neutral-950 px-6 py-6 transition-all focus:ring-primary-500/20' }"
             />
             <div class="flex items-center justify-between">
                <span class="text-[10px] text-neutral-400">Conseil : utilisez le markdown pour formater votre code !</span>
                <div class="flex gap-3">
                   <UButton label="Preview" variant="ghost" color="neutral" size="sm" />
                   <UButton :loading="sending" label="Publier ma réponse" icon="i-lucide-send" color="primary" size="sm" class="px-8" @click="handlePostReply" />
                </div>
             </div>
          </div>
       </div>

       <!-- Guest / Non-Member CTA -->
       <div v-else class="p-12 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/10 text-center space-y-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 text-primary-500 mb-2">
             <UIcon :name="session ? 'i-lucide-award' : 'i-lucide-lock'" class="w-8 h-8" />
          </div>
          <div class="max-w-md mx-auto space-y-2">
             <h3 class="text-2xl font-black tracking-tighter uppercase">
                {{ session ? 'Rejoignez la communauté' : 'Connexion requise' }}
             </h3>
             <p class="text-neutral-500 text-sm">
                {{ session 
                   ? 'Pour interagir avec le forum, vous devez accepter les conditions d\'utilisation de la communauté Techknè.' 
                   : 'Connectez-vous pour participer aux discussions et partager votre savoir.' 
                }}
             </p>
          </div>
          <div class="flex items-center justify-center gap-4">
             <template v-if="session">
                <UButton label="Accepter les CGU" color="primary" size="md" class="px-8" @click="navigateTo('/forum/rules')" />
             </template>
             <template v-else>
                <UButton label="Se connecter" color="primary" size="md" class="px-8" @click="navigateTo('/login')" />
                <UButton label="S'inscrire" variant="ghost" color="neutral" size="md" @click="navigateTo('/register')" />
             </template>
          </div>
       </div>
    </section>
  </div>
</template>


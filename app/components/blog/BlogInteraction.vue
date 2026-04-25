<script setup lang="ts">
const props = defineProps<{
  topicId: string; // The ID from Content (path or UUID)
  title: string;
  enableComments: boolean;
}>()

const { isMember, handleVote } = useCommunity()
const notify = useNotify()

// Local stats (mock for now, should be connected to communityTopics)
const likes = ref(Math.floor(Math.random() * 50) + 10)
const hasLiked = ref(false)

const toggleLike = () => {
  if (!isMember.value) {
    notify.warning('Adhésion requise', 'Acceptation des CGU nécessaire pour interagir.')
    return
  }
  hasLiked.value = !hasLiked.value
  likes.value += hasLiked.value ? 1 : -1
}

const share = () => {
  if (navigator.share) {
    navigator.share({
      title: props.title,
      url: window.location.href
    }).catch(console.error)
  } else {
    navigator.clipboard.writeText(window.location.href)
    notify.success('Copié !', 'Lien de l\'article copié dans le presse-papier.')
  }
}

// Comments Logic
const { data: communityTopicData, refresh: refreshComments } = await useFetch<any>(`/api/community/topics/${encodeURIComponent(props.topicId)}`, {
  params: { context: 'blog', createIfMissing: true, title: props.title }
})

const comments = computed(() => communityTopicData.value?.topic?.replies || communityTopicData.value?.replies || [])
const newComment = ref('')
const isSubmitting = ref(false)

const postComment = async () => {
  if (!newComment.value.trim() || isSubmitting.value) return
  if (!isMember.value) {
    notify.warning('Adhésion requise', 'Acceptation des CGU nécessaire pour commenter.')
    return
  }
  
  isSubmitting.value = true
  try {
    await $fetch(`/api/community/replies`, {
      method: 'POST',
      body: { 
        topicId: communityTopicData.value?.id, 
        content: newComment.value 
      }
    })
    newComment.value = ''
    await refreshComments()
    notify.success('Commentaire publié')
  } catch (e: any) {
    notify.error('Erreur', e.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mt-20 border-t border-default pt-12">
    <!-- Interaction Bar -->
    <div class="flex items-center justify-between mb-20 bg-neutral-50 dark:bg-neutral-900/40 p-6 rounded-3xl border border-default">
       <div class="flex items-center gap-6">
          <button 
            class="flex items-center gap-2 group transition-all"
            :class="hasLiked ? 'text-primary' : 'text-dimmed hover:text-primary'"
            @click="toggleLike"
          >
            <div class="size-10 rounded-full flex items-center justify-center transition-colors" :class="hasLiked ? 'bg-primary/10' : 'bg-default/50 group-hover:bg-primary/5'">
               <UIcon :name="hasLiked ? 'i-lucide:heart' : 'i-lucide:heart'" :class="hasLiked ? 'fill-current' : ''" class="size-5" />
            </div>
            <span class="font-black text-sm">{{ likes }}</span>
          </button>

          <div class="flex items-center gap-2 text-dimmed">
            <div class="size-10 rounded-full bg-default/50 flex items-center justify-center">
               <UIcon name="i-lucide:message-circle" class="size-5" />
            </div>
            <span class="font-black text-sm">{{ comments.length }}</span>
          </div>
       </div>

       <UButton 
         icon="i-lucide:share-2" 
         label="Partager" 
         variant="soft" 
         color="neutral" 
         size="sm" 
         class="rounded-xl font-bold"
         @click="share"
       />
    </div>

    <!-- Comments Section -->
    <section v-if="enableComments" id="comments" class="max-w-3xl mx-auto">
       <h3 class="text-xl font-black italic uppercase tracking-tight mb-8 flex items-center gap-3">
          <UIcon name="i-lucide:messages-square" class="text-primary" />
          Commentaires
          <span class="text-xs font-medium not-italic bg-default px-2 py-0.5 rounded text-dimmed">{{ comments.length }}</span>
       </h3>

       <!-- Post Coment -->
       <div class="mb-12">
          <div v-if="!isMember" class="p-6 rounded-3xl bg-warning/5 border border-warning/10 text-center">
             <p class="text-sm font-medium mb-4">Rejoignez la communauté Techknè pour participer à la discussion.</p>
             <UButton to="/community" label="Accepter les CGU & Participer" icon="i-lucide:shield-check" color="warning" variant="solid" size="sm" class="rounded-xl font-bold" />
          </div>
          <div v-else class="space-y-4">
             <UTextarea 
               v-model="newComment" 
               placeholder="Votre avis sur cet article..." 
               class="rounded-2xl" 
               :rows="3"
               :disabled="isSubmitting"
             />
             <div class="flex justify-end">
                <UButton 
                  label="Publier le commentaire" 
                  icon="i-lucide:send" 
                  color="primary" 
                  :loading="isSubmitting"
                  class="rounded-xl font-black text-[10px] uppercase tracking-widest px-6" 
                  @click="postComment"
                />
             </div>
          </div>
       </div>

       <!-- Comments List -->
       <div class="space-y-6">
          <div v-for="c in comments" :key="c.id" class="p-6 rounded-3xl border border-default bg-white/50 dark:bg-neutral-900/20">
             <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                   <UAvatar :src="c.author?.image" :alt="c.author?.name" size="xs" />
                   <div>
                      <p class="text-xs font-black uppercase tracking-tight">{{ c.author?.name }}</p>
                      <p class="text-[10px] text-dimmed">{{ new Date(c.createdAt).toLocaleDateString() }}</p>
                   </div>
                </div>
                <UButton icon="i-lucide:flag" variant="ghost" color="neutral" size="xs" @click="() => notify.info('Signalement envoyé')" />
             </div>
             <p class="text-sm leading-relaxed">{{ c.content }}</p>
          </div>
       </div>
    </section>

    <div v-else class="py-12 text-center opacity-30 italic text-sm">
       Les commentaires sont désactivés pour cet article.
    </div>
  </div>
</template>

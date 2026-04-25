<script setup lang="ts">
definePageMeta({
  layout: 'forum'
});

const localePath = useLocalePath();
const { isMember, checkMembership, isLoading: forumLoading } = useCommunity();
const notify = useNotify();

const { data: categoriesData, status: catStatus } = await useAsyncData(
  'forum-categories-list',
  () => $fetch('/api/community/categories')
);

const categories = computed(() => (categoriesData.value || []).map((c: any) => ({ label: c.name, value: c.id })));

const form = reactive({
  title: '',
  categoryId: '',
  content: '',
  tags: [],
  assetIds: [] as string[]
});

const attachments = ref<any[]>([]);
const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const isSubmitting = ref(false);
const showPreview = ref(false);

const handleSubmit = async () => {
  if (!isMember.value) return;
  
  isSubmitting.value = true;
  try {
    form.assetIds = attachments.value.map(a => a.id);
    await $fetch('/api/community/topics', {
      method: 'POST',
      body: form
    });
    // Refresh index threads and navigate
    refreshNuxtData('forum-threads');
    navigateTo(localePath('/forum'));
  } catch (e: any) {
    console.error('Failed to create thread:', e);
    notify.error('Erreur', e.data?.statusMessage || 'Échec de la création');
  } finally {
    isSubmitting.value = false;
  }
};

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files?.length) return;

  isUploading.value = true;

  for (const file of Array.from(files)) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'forum_thread');

    try {
      const res = await $fetch<any>('/api/assets/upload', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        attachments.value.push(res.asset);
      }
    } catch (e: any) {
      notify.error('Erreur upload', `Fichier ${file.name} trop lourd ou invalide`);
    }
  }

  isUploading.value = false;
  if (fileInput.value) fileInput.value.value = '';
};

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id);
};

onMounted(() => {
  checkMembership();
});


const tips = [
  { icon: 'i-lucide-lightbulb', title: 'Soyez précis', desc: 'Un titre clair attire plus de réponses pertinentes.' },
  { icon: 'i-lucide-code-2', title: 'Formatez le code', desc: 'Utilisez les blocs de code markdown pour la lisibilité.' },
  { icon: 'i-lucide-search', title: 'Cherchez d\'abord', desc: 'La solution existe peut-être déjà dans nos discussions.' }
];
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-10 pb-20">
    <!-- Header -->
    <header class="space-y-4">
       <div class="flex items-center gap-2">
          <UButton 
            :to="localePath('/forum')" 
            icon="i-lucide-arrow-left" 
            variant="ghost" 
            color="neutral" 
            size="xs" 
            class="text-neutral-400"
          />
          <UBadge variant="soft" color="primary" class="text-[9px] font-black uppercase tracking-widest px-2">Nouveau Thread</UBadge>
       </div>
       <h1 class="text-4xl font-black tracking-tighter leading-none mb-1">
          Posez votre <span class="text-primary-500 underline decoration-4 decoration-primary-500/20 underline-offset-8">Question</span>
       </h1>
       <p class="text-neutral-500 font-medium">Une communauté d'experts est prête à vous répondre. Soyez précis pour obtenir la meilleure aide possible.</p>
    </header>

    <!-- Form Section -->
    <section class="p-8 md:p-12 rounded-[2.5rem] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-primary-500/5 relative overflow-hidden">
       <!-- Decoration -->
       <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-pulse" />
       
       <UForm :state="form" class="space-y-8 relative z-10" @submit="handleSubmit">
          <!-- Title -->
          <UFormField label="Titre de la discussion" name="title" description="Résumez votre problème en une phrase courte.">
             <UInput 
               v-model="form.title" 
               placeholder="ex: Comment synchroniser Drizzle avec TiDB Cloud ?" 
               size="lg" 
               class="font-bold"
               :ui="{ base: 'rounded-2xl transition-all focus:ring-primary-500/30' }"
             />
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <!-- Category Selection -->
             <UFormField label="Catégorie" name="categoryId">
                <USelect 
                  v-model="form.categoryId" 
                  :items="categories" 
                  placeholder="Choisir une catégorie" 
                  size="lg"
                  :ui="{ base: 'rounded-xl' }"
                />
             </UFormField>

             <!-- Tags (Mock) -->
             <UFormField label="Tags" name="tags">
                <UInput placeholder="auth, api, database..." size="lg" :ui="{ base: 'rounded-xl' }" />
             </UFormField>
          </div>

          <!-- Content Editor -->
          <UFormField label="Contenu" name="content">
             <div class="rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
                <!-- Editor Toolbar -->
                <div class="flex items-center gap-1 p-2 border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-900/50">
                    <UButton icon="i-lucide-bold" variant="ghost" color="neutral" size="xs" />
                    <UButton icon="i-lucide-italic" variant="ghost" color="neutral" size="xs" />
                    <UButton icon="i-lucide-code" variant="ghost" color="neutral" size="xs" />
                    <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
                    <input type="file" ref="fileInput" class="hidden" multiple @change="handleFileChange" />
                    <UButton 
                      icon="i-lucide-paperclip" 
                      variant="ghost" 
                      color="neutral" 
                      size="xs" 
                      :loading="isUploading"
                      @click="triggerUpload"
                    />
                    <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
                    <UButton label="Preview" icon="i-lucide-eye" :variant="showPreview ? 'solid' : 'ghost'" color="primary" size="xs" @click="showPreview = !showPreview" />
                </div>
                
                <div class="relative">
                   <UTextarea 
                     v-show="!showPreview"
                     v-model="form.content" 
                     placeholder="Décrivez votre problème en détail..." 
                     :rows="12" 
                     class="border-none shadow-none ring-0 focus:ring-0 px-8 py-8 font-medium"
                   />
                   <div v-show="showPreview" class="p-8 min-h-[300px] prose dark:prose-invert prose-sm max-w-none">
                      {{ form.content || 'Aperçu du contenu...' }}
                   </div>
                </div>

                <!-- Attachments Preview -->
                <div v-if="attachments.length > 0" class="px-8 pb-8 flex flex-wrap gap-2">
                   <div 
                    v-for="att in attachments" 
                    :key="att.id"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold"
                   >
                    <UIcon :name="att.mimeType.includes('image') ? 'i-lucide-image' : 'i-lucide-file-text'" class="size-3.5 text-primary-500" />
                    <span class="max-w-[120px] truncate">{{ att.filename }}</span>
                    <button type="button" @click="removeAttachment(att.id)" class="text-neutral-400 hover:text-error-500 transition-colors">
                      <UIcon name="i-lucide-x" class="size-3.5" />
                    </button>
                   </div>
                </div>
             </div>
          </UFormField>

          <!-- Submit Actions -->
          <div class="flex items-center justify-between pt-6">
             <div class="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-neutral-400">
                <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-green-500" />
                <span>Respectez les règles communautaires</span>
             </div>
             <div class="flex gap-4">
                <UButton label="Annuler" variant="ghost" color="neutral" size="sm" @click="navigateTo(localePath('/forum'))" />
                <UButton 
                  type="submit" 
                  label="Publier la discussion" 
                  icon="i-lucide-send" 
                  size="md" 
                  class="px-10 rounded-xl"
                  :loading="isSubmitting"
                />
             </div>
          </div>
       </UForm>
    </section>

    <!-- Tips Sidebar (Helper) -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div v-for="(tip, i) in tips" :key="i" class="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/60">
          <UIcon :name="tip.icon" class="w-6 h-6 text-primary-500 mb-3" />
          <h4 class="text-xs font-black uppercase tracking-widest mb-1">{{ tip.title }}</h4>
          <p class="text-[10px] text-neutral-500 leading-relaxed font-medium">{{ tip.desc }}</p>
       </div>
    </section>
  </div>
</template>

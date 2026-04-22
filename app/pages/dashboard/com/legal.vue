<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  title: 'Documents Légaux'
});

const { data: legalAssets, refresh } = await useAsyncData('legal-assets', () => $fetch('/api/assets/list?type=legal'));

const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const notify = useNotify();

const triggerUpload = () => fileInput.value?.click();

const handleUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files?.length) return;

    isUploading.value = true;

    for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'legal');

        try {
            await $fetch('/api/assets/upload', {
                method: 'POST',
                body: formData
            });
            notify.success('Succès', `${file.name} mis en ligne`);
        } catch (e: any) {
            notify.error('Erreur', e.data?.message || 'Upload échoué');
        }
    }

    isUploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
    refresh();
};

const formatDate = (date: string) => new Date(date).toLocaleDateString();
const formatSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
</script>

<template>
  <div class="p-6 space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight uppercase">Gestion des Documents Légaux</h1>
        <p class="text-sm text-dimmed">Centralisez vos PDFs (CGU, Mentions Légales, etc.) sur R2.</p>
      </div>
      <div class="flex gap-2">
        <input type="file" ref="fileInput" class="hidden" accept="application/pdf" @change="handleUpload" />
        <UButton 
          label="Uploader un document" 
          icon="i-lucide-upload" 
          color="primary" 
          :loading="isUploading"
          @click="triggerUpload" 
        />
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard 
        v-for="asset in legalAssets" 
        :key="asset.id"
        class="group border-default hover:border-primary/50 transition-all"
      >
        <div class="flex flex-col h-full">
          <div class="flex items-start justify-between mb-4">
            <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <UIcon name="i-lucide-file-text" class="size-6" />
            </div>
            <UBadge color="neutral" variant="soft" size="xs">{{ formatDate(asset.createdAt) }}</UBadge>
          </div>
          
          <h3 class="font-bold text-lg mb-1 truncate" :title="asset.filename">{{ asset.filename }}</h3>
          <p class="text-xs text-dimmed mb-6">Taille : {{ formatSize(asset.size) }}</p>

          <div class="mt-auto flex gap-2">
            <UButton 
              :to="asset.publicUrl" 
              target="_blank" 
              label="Voir le PDF" 
              variant="solid" 
              color="neutral" 
              block 
              icon="i-lucide-external-link"
            />
          </div>
        </div>
      </UCard>

      <div v-if="legalAssets?.length === 0" class="col-span-full py-20 text-center border-2 border-dashed border-default rounded-3xl">
        <UIcon name="i-lucide-folder-open" class="size-12 text-dimmed mx-auto mb-4" />
        <p class="text-dimmed font-bold">Aucun document pour le moment.</p>
      </div>
    </div>
  </div>
</template>

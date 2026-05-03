<script setup lang="ts">
/**
 * ForgeImageProcessor
 * Composant mutualisé pour le crop, le resize et l'upload d'images (Avatar, Community, etc.)
 */
const props = defineProps<{
  modelValue?: string
  aspectRatio?: number
  circle?: boolean
  label?: string
}>()

const emit = defineEmits(['update:modelValue', 'upload:start', 'upload:end', 'error'])

const { uploadAttachment, isComposerLoading } = useComposer()
const isProcessing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref(props.modelValue || '')

// Simulation de crop pour le moment (en attendant l'intégration d'une lib de crop si nécessaire)
// Le but est de mutualiser l'UI et le flux d'upload
const triggerUpload = () => fileInput.value?.click()

defineExpose({ triggerUpload })

const handleFile = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  emit('upload:start')
  isProcessing.value = true

  try {
    // Utilisation du StorageService via useComposer ou API directe
    const formData = new FormData()
    formData.append('file', file)
    
    // On passe par l'API d'assets unifiée
    const res = await $fetch<any>('/api/assets/upload', {
      method: 'POST',
      body: formData,
      query: {
        type: 'avatar',
        visibility: 'public'
      }
    })

    if (res.success) {
      previewUrl.value = res.asset.publicUrl || res.asset.url
      emit('update:modelValue', previewUrl.value)
      emit('upload:end', res.asset)
    }
  } catch (err: any) {
    emit('error', err.message)
  } finally {
    isProcessing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <slot :trigger="triggerUpload" :is-processing="isProcessing">
      <div 
        class="relative group cursor-pointer overflow-hidden border-2 border-dashed border-default hover:border-primary transition-all"
        :class="[
          circle ? 'rounded-full' : 'rounded-3xl',
          'size-32 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900'
        ]"
        @click="triggerUpload"
      >
        <img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" />
        <div v-else class="flex flex-col items-center gap-1 text-dimmed">
          <UIcon name="i-lucide:image-plus" class="size-6" />
          <span class="text-[10px] font-black uppercase tracking-tighter">{{ label || 'Ajouter' }}</span>
        </div>

        <!-- Overlay loading -->
        <div v-if="isProcessing" class="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-10">
          <UIcon name="i-lucide:loader-2" class="size-6 animate-spin text-white" />
        </div>

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <UIcon name="i-lucide:pencil" class="size-5 text-white" />
        </div>
      </div>
    </slot>

    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFile" />
    
    <div v-if="previewUrl && !($slots.default)" class="flex gap-2">
       <UButton 
        label="Recadrer" 
        icon="i-lucide:crop" 
        variant="ghost" 
        color="neutral" 
        size="xs" 
        class="rounded-lg text-[10px] font-black uppercase"
        @click="triggerUpload"
       />
       <UButton 
        label="Supprimer" 
        icon="i-lucide:trash" 
        variant="ghost" 
        color="error" 
        size="xs" 
        class="rounded-lg text-[10px] font-black uppercase"
        @click="previewUrl = ''; emit('update:modelValue', '')"
       />
    </div>
  </div>
</template>

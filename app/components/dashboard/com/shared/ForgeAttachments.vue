<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { uploadAttachment, isComposerLoading } = useComposer()

const handleFileSelect = (e: any) => {
  const files = e.target.files
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
        uploadAttachment(files[i])
    }
  }
}
</script>

<template>
  <div class="mt-4 bg-white dark:bg-neutral-900 p-4 rounded-[2rem] border border-default shadow-lg">
    <div class="flex items-center justify-between mb-2 px-4">
       <div class="flex items-center gap-2">
          <div class="size-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
             <UIcon name="i-lucide:paperclip" class="size-3 text-dimmed" />
          </div>
          <span class="text-[10px] font-black uppercase tracking-widest text-dimmed">Pièces jointes ({{ formData.attachments.length }})</span>
       </div>
       
       <label class="cursor-pointer group" :class="{ 'opacity-50 pointer-events-none': isComposerLoading }">
          <span class="text-[10px] font-black uppercase tracking-widest text-primary group-hover:bg-primary/10 px-4 py-2 rounded-xl transition-all border border-primary/20 bg-primary/5">
             {{ isComposerLoading ? 'Chargement...' : '+ Ajouter des fichiers' }}
          </span>
          <input type="file" multiple class="hidden" @change="handleFileSelect" :disabled="isComposerLoading" />
       </label>
    </div>
    
    <div v-if="formData.attachments.length > 0" class="flex flex-wrap gap-2 pt-2 border-t border-default/10 mx-4">
       <div v-for="(file, idx) in formData.attachments" :key="idx" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-default animate-in zoom-in-95">
          <UIcon name="i-lucide:file-text" class="size-3 text-primary/60" />
          <span class="text-[9px] font-bold truncate max-w-[150px]">{{ file.filename }}</span>
          <UButton icon="i-lucide:x" variant="ghost" color="neutral" size="xs" class="hover:text-error scale-75" @click="formData.attachments.splice(idx, 1)" />
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: any,
  layouts: any[]
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { isComposerLoading, saveDraft } = useComposer()
</script>

<template>
  <div class="h-full flex flex-col p-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
    <div class="flex-1 flex flex-col max-w-7xl mx-auto w-full gap-6">
      
      <!-- MODULE: RECIPIENTS & SUBJECT -->
      <DashboardComSharedForgeHeader v-model="formData" />

      <!-- MODULE: DYNAMIC EDITING WORKSTATION -->
      <DashboardComSharedForgeWorkstation 
        v-model="formData" 
        :layouts="layouts" 
      />

      <!-- MODULE: ATTACHMENTS -->
      <DashboardComSharedForgeAttachments v-model="formData" />

      <!-- LOCAL ACTIONS & GUIDANCE -->
      <div class="flex justify-between items-center bg-white/50 dark:bg-neutral-900/50 p-4 rounded-3xl border border-default/40">
         <div class="flex items-center gap-2">
            <UButton 
              label="Sauvegarder Brouillon" 
              icon="i-lucide:save" 
              variant="soft" 
              color="neutral" 
              class="rounded-xl px-4 text-xs font-black uppercase" 
              @click="saveDraft" 
            />
            <span v-if="isComposerLoading" class="text-[9px] font-bold text-primary animate-pulse ml-2 uppercase tracking-widest">Auto-saving...</span>
         </div>
         
         <div class="flex items-center gap-4">
            <UTooltip text="Votre contenu est automatiquement mappé sur l'architecture choisie à l'étape 1.">
               <div class="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
                  <UIcon name="i-lucide:sparkles" class="size-3 text-primary" />
                  <span class="text-[9px] text-primary font-bold uppercase tracking-widest">Intelligence du Forge Studio Active</span>
               </div>
            </UTooltip>
            <p class="text-[9px] text-dimmed font-medium uppercase tracking-tighter italic opacity-50 max-w-[200px] leading-tight">
              L'Architecture sélectionnée adapte dynamiquement La Forge pour un rendu parfait.
            </p>
         </div>
      </div>
    </div>
  </div>
</template>

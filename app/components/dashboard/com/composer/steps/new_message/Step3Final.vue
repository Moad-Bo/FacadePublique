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

const previewZoom = ref(85)
const analyzerRef = ref<any>(null)
const { saveDraft, isComposerLoading } = useComposer()

// Summary logic
</script>

<template>
  <div class="h-full flex gap-8 p-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
     <!-- LEFT: SUMMARY & PLANNING SECTION -->
     <div class="w-1/3 flex flex-col gap-6 overflow-y-auto pr-4 scrollbar-thin">
        <div class="text-left space-y-2">
           <h3 class="text-2xl font-black uppercase italic italic">Dernières vérifications</h3>
           <p class="text-[10px] text-dimmed uppercase tracking-widest font-bold">Révisez votre envoi avant le lancement</p>
        </div>

        <!-- SUMMARY CARD -->
        <UCard class="bg-white dark:bg-neutral-900 border-2 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
           <div class="space-y-6">
              <div class="flex items-center gap-3 border-b border-default pb-4">
                 <div class="size-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                    <UIcon name="i-lucide:clipboard-check" class="size-5" />
                 </div>
                 <h4 class="font-black uppercase italic text-sm">Récapitulatif</h4>
              </div>

              <div class="space-y-4">
                 <div>
                    <p class="text-[10px] text-dimmed uppercase font-black tracking-widest mb-1">À (Destinataire)</p>
                    <p class="text-xs font-bold truncate">{{ formData.to || 'Non renseigné' }}</p>
                 </div>
                 
                 <div>
                    <p class="text-[10px] text-dimmed uppercase font-black tracking-widest mb-1">Objet</p>
                    <p class="text-xs font-bold leading-tight line-clamp-2">{{ formData.subject || 'Aucun objet' }}</p>
                 </div>

                 <div class="grid grid-cols-2 gap-4 pt-2 border-t border-default/50">
                    <div>
                       <p class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Design</p>
                       <p class="text-[10px] font-bold text-primary">{{ formData.layoutId }}</p>
                    </div>
                    <div>
                       <p class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Structure</p>
                       <p class="text-[10px] font-bold text-warning">{{ formData.contentLayoutId || 'Simple' }}</p>
                    </div>
                 </div>

                 <div v-if="formData.attachments.length > 0" class="pt-2">
                    <p class="text-[10px] text-dimmed uppercase font-black tracking-widest mb-1">Pièces Jointes</p>
                    <div class="flex items-center gap-2">
                       <UIcon name="i-lucide:paperclip" class="size-3" />
                       <span class="text-[10px] font-bold">{{ formData.attachments.length }} fichier(s)</span>
                    </div>
                 </div>
              </div>
           </div>
        </UCard>

        <!-- PLANNING SECTION -->
        <div class="bg-neutral-50 dark:bg-neutral-800/40 p-8 rounded-[2.5rem] border border-default shadow-xl space-y-6">
           <div class="flex items-center gap-3">
              <UIcon name="i-lucide:calendar-clock" class="size-5 text-primary" />
              <h4 class="font-black uppercase italic text-xs">Plan d'envoi</h4>
           </div>
           
           <UFormField label="Date d'envoi (Optionnel)">
              <template #label>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold">Date d'envoi (Optionnel)</span>
                  <UTooltip text="Option facultative">
                    <UIcon name="i-lucide:help-circle" class="size-3.5 opacity-50" />
                  </UTooltip>
                </div>
              </template>
              <UInput v-model="formData.scheduledAt" type="datetime-local" size="lg" />
           </UFormField>
           
           <div v-if="formData.scheduledAt" class="animate-in fade-in slide-in-from-top-2">
              <UFormField label="Récurrence">
                 <USelect v-model="formData.recurrence" :items="['none', 'daily', 'weekly', 'monthly']" size="lg" />
              </UFormField>
           </div>
           <p class="text-[9px] text-dimmed italic">Laissez vide pour un envoi immédiat.</p>
        </div>

        <!-- ACTIONS -->
        <div class="flex flex-col gap-3">
           <UButton 
             label="Sauvegarder Brouillon" 
             icon="i-lucide:save" 
             variant="soft" 
             color="neutral" 
             class="w-full rounded-2xl py-3 font-bold uppercase tracking-widest text-[10px]" 
             @click="saveDraft" 
             :loading="isComposerLoading" 
           />
           
           <UButton 
             label="Analyser la conformité" 
             icon="i-lucide:gauge" 
             variant="outline" 
             color="primary" 
             class="w-full rounded-2xl py-3 font-bold uppercase tracking-widest text-[10px] border-2" 
             @click="() => analyzerRef?.open()"
           />
        </div>

        <DashboardComSharedForgeAnalysis 
          ref="analyzerRef"
          v-model="formData"
          :shell-id="formData.layoutId"
          :sections="formData.sections"
        />
     </div>

     <!-- RIGHT: FINAL PREVIEW (Mutualized) -->
     <div class="flex-1 flex flex-col gap-4 overflow-hidden">
        <DashboardComSharedMasterPreview 
           :shell-id="formData.layoutId"
           :content-layout-id="formData.contentLayoutId"
           :sections="formData.sections"
           :layouts="layouts"
           title="Rendu final avant expédition"
        />
     </div>
  </div>
</template>

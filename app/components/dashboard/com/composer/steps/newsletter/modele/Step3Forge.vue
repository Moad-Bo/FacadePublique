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

const { isComposerLoading, saveCampaign } = useComposer()
</script>

<template>
  <div class="h-full flex flex-col p-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
    <div class="flex-1 flex flex-col max-w-7xl mx-auto w-full gap-6">
      
      <!-- RECAP STRATEGY -->
      <div class="bg-white dark:bg-neutral-900 border border-default rounded-[2.5rem] shadow-xl p-6 px-10 flex items-center justify-between shrink-0">
         <div class="flex items-center gap-6">
            <div class="flex items-center gap-3">
               <div class="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UIcon name="i-lucide:megaphone" class="size-4 text-primary" />
               </div>
               <div>
                  <p class="text-[9px] font-black uppercase text-dimmed tracking-widest leading-none">Campagne</p>
                  <h4 class="font-bold text-sm truncate max-w-[200px]">{{ formData.name || 'Sans Nom' }}</h4>
               </div>
            </div>
            
            <div class="h-8 w-px bg-default" />

            <div class="flex items-center gap-3">
               <div class="size-8 rounded-xl bg-success/10 flex items-center justify-center">
                  <UIcon name="i-lucide:users" class="size-4 text-success" />
               </div>
               <div>
                  <p class="text-[9px] font-black uppercase text-dimmed tracking-widest leading-none">Audience</p>
                  <h4 class="font-bold text-sm uppercase italic">{{ formData.listId || 'Tous' }}</h4>
               </div>
            </div>
         </div>

         <div class="flex items-center gap-4">
            <UFormField label="Objet FINAL" :ui="{ label: 'text-[9px] uppercase font-black text-dimmed ml-1' }">
               <UInput v-model="formData.subject" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-xl px-4 py-1 ring-1 ring-default focus-within:ring-primary w-64" />
            </UFormField>
         </div>
      </div>

      <!-- THE CORE FORGE WORKSTATION -->
      <DashboardComSharedForgeWorkstation 
        v-model="formData" 
        :layouts="layouts" 
      />

      <!-- ATTACHMENTS (Assets/Images) -->
      <DashboardComSharedForgeAttachments v-model="formData" />

      <!-- GUIDANCE & TOOLS -->
      <div class="flex justify-between items-center bg-white/50 dark:bg-neutral-900/50 p-4 rounded-3xl border border-default/40">
         <p class="text-[9px] text-dimmed font-medium uppercase tracking-tighter italic opacity-50 max-w-[400px]">
           Les variables Techknè (ex: <span v-pre>{{user_name}}</span>) sont injectées dynamiquement lors de l'envoi massif de la campagne.
         </p>
         
         <div class="flex items-center gap-4">
            <UButton 
              label="Brouillon" 
              icon="i-lucide:save" 
              variant="soft" 
              color="neutral" 
              class="rounded-xl px-4 text-xs font-black uppercase" 
              @click="saveCampaign('draft')" 
            />
            <UTooltip text="Votre campagne sera inspectée par le module de délivrabilité avant l'envoi final.">
               <div class="flex items-center gap-2 px-4 py-2 bg-success/5 rounded-full border border-success/10">
                  <UIcon name="i-lucide:shield-check" class="size-3 text-success" />
                  <span class="text-[9px] text-success font-bold uppercase tracking-widest">Contrôleur de Spam Actif</span>
               </div>
            </UTooltip>
         </div>
      </div>

    </div>
  </div>
</template>

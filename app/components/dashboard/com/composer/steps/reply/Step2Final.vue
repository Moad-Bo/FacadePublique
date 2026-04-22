<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()
const emit = defineEmits(['update:modelValue'])
const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="flex-1 overflow-hidden flex flex-col p-8 gap-8">
     <!-- RECAP CARD -->
     <div class="p-8 bg-neutral-50 dark:bg-neutral-900 border border-default rounded-[3rem] shadow-sm">
        <h2 class="text-2xl font-black italic uppercase tracking-tighter mb-4">Revue de la Réponse</h2>
        <div class="grid grid-cols-2 gap-4">
           <div class="p-4 bg-white dark:bg-black rounded-2xl border border-default">
              <span class="text-[10px] font-bold text-dimmed uppercase">Destinataire</span>
              <p class="font-bold">{{ formData.to }}</p>
           </div>
           <div class="p-4 bg-white dark:bg-black rounded-2xl border border-default">
              <span class="text-[10px] font-bold text-dimmed uppercase">Objet</span>
              <p class="font-bold">{{ formData.subject }}</p>
           </div>
        </div>
     </div>

     <!-- PREVIEW -->
     <div class="flex-1 min-h-[500px] flex flex-col">
        <DashboardComSharedMasterPreview 
          :content="formData.body" 
          :shell-id="formData.layoutId || 'inbox'"
          title="Rendu final de la réponse"
          class="flex-1"
        />
     </div>
  </div>
</template>

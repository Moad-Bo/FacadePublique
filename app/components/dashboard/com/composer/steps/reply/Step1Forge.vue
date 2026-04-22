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
  <div class="p-8 h-full flex flex-col gap-6 overflow-y-auto">
    <div class="flex items-center gap-4 p-6 bg-primary/5 rounded-3xl border border-primary/10">
       <div class="p-3 bg-primary/10 text-primary rounded-2xl">
          <UIcon name="i-lucide:reply" class="size-6" />
       </div>
       <div>
          <h1 class="text-xl font-black italic uppercase tracking-tight">Réponse Rapide</h1>
          <p class="text-sm text-dimmed">Saisie du message de réponse...</p>
       </div>
    </div>

    <!-- PREMIUM EDITOR FOR REPLY -->
    <div class="flex-1 min-h-[500px] flex flex-col">
       <DashboardComSharedRichEditor 
         v-model="formData.body" 
         label="VOTRE RÉPONSE (FORGE)"
         placeholder="Rédigez votre réponse ici..."
         class="flex-1"
       />
    </div>
  </div>
</template>

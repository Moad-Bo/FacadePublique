<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const showCcBcc = ref(false)
</script>

<template>
  <div class="bg-white dark:bg-neutral-900 border border-default rounded-[2.5rem] shadow-xl p-8 space-y-4 shrink-0 transition-all duration-500 relative overflow-hidden">
     <!-- Accent design -->
     <div class="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

     <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
           <div class="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide:send" class="size-4 text-primary" />
           </div>
           <span class="text-[10px] font-black uppercase tracking-widest text-primary">Configuration du message</span>
        </div>
        <UButton 
          :label="showCcBcc ? 'Masquer Cc/Cci' : 'Ajouter Cc/Cci'" 
          variant="soft" 
          color="primary" 
          size="xs" 
          class="font-extrabold text-[9px] uppercase rounded-lg"
          @click="showCcBcc = !showCcBcc" 
        />
     </div>

     <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 md:col-span-8 space-y-4">
          <UFormField label="Destinataire (À)" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
             <UInput v-model="formData.to" placeholder="ex: client@example.com" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-2 ring-1 ring-default shadow-sm focus-within:ring-primary" />
          </UFormField>

          <UFormField label="Objet du message" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
             <UInput v-model="formData.subject" placeholder="Sujet de votre communication..." variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-3 ring-1 ring-default shadow-sm focus-within:ring-primary font-bold text-lg" />
          </UFormField>
        </div>

        <div v-if="showCcBcc" class="col-span-12 md:col-span-4 space-y-4 animate-in fade-in slide-in-from-right-4">
          <UFormField label="Cc" :ui="{ label: 'text-[10px] uppercase font-bold text-dimmed ml-1' }">
             <UInput v-model="formData.cc" placeholder="Copie carbone" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-xl px-4 py-1" />
          </UFormField>
          <UFormField label="Cci (Bcc)" :ui="{ label: 'text-[10px] uppercase font-bold text-dimmed ml-1' }">
             <UInput v-model="formData.bcc" placeholder="Copie cachée" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-xl px-4 py-1" />
          </UFormField>
        </div>
     </div>
  </div>
</template>

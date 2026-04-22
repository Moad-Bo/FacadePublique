<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const lists = [
  { id: 'all', label: 'Tous les contacts', count: 1240, icon: 'i-lucide:users' },
  { id: 'clients', label: 'Clients Actifs', count: 450, icon: 'i-lucide:shopping-bag' },
  { id: 'leads', label: 'Prospects (Leads)', count: 890, icon: 'i-lucide:target' },
  { id: 'newsletter', label: 'Abonnés Newsletter', count: 3200, icon: 'i-lucide:megaphone' },
]
</script>

<template>
  <div class="h-full flex flex-col p-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto scrollbar-thin">
    <div class="max-w-4xl mx-auto w-full space-y-12">
      
      <!-- HEADER -->
      <div class="space-y-2 text-center">
         <div class="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full border border-success/20 mb-4">
            <UIcon name="i-lucide:calendar-range" class="size-4 text-success" />
            <span class="text-[10px] font-black uppercase tracking-widest text-success">Planification de Campagne</span>
         </div>
         <h2 class="text-4xl font-black uppercase italic tracking-tighter">Stratégie d'Envoi</h2>
         <p class="text-dimmed text-sm uppercase tracking-widest font-bold">Définissez votre cible et l'identité de votre diffusion</p>
      </div>

      <div class="grid grid-cols-12 gap-8">
         <!-- LEFT: GENERAL INFO -->
         <div class="col-span-12 md:col-span-7 space-y-8 p-10 bg-white dark:bg-neutral-900 rounded-[3rem] border border-default shadow-2xl">
            <UFormField label="Nom interne de la campagne" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
               <UInput v-model="formData.name" placeholder="ex: Soldes Été 2026 - Flash Sale" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-3 ring-1 ring-default shadow-sm focus-within:ring-primary font-bold" />
            </UFormField>

            <UFormField label="Objet du message (Subject)" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
               <UInput v-model="formData.subject" placeholder="L'objet que vos clients verront..." variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-4 ring-1 ring-default shadow-sm focus-within:ring-primary text-lg font-black italic tracking-tight" />
            </UFormField>

            <div class="pt-4 flex items-center gap-4">
               <div class="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex-1">
                  <p class="text-[9px] font-black uppercase text-primary mb-1">Délai d'optimisation</p>
                  <p class="text-[11px] font-medium leading-tight">Envoi optimisé selon les habitudes d'ouverture de chaque destinataire.</p>
               </div>
               <UToggle v-model="formData.optimized" />
            </div>
         </div>

         <!-- RIGHT: AUDIENCE SELECTION -->
         <div class="col-span-12 md:col-span-5 space-y-6 flex flex-col justify-center">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-dimmed ml-4">Sélection de l'Audience</h3>
            
            <div class="grid gap-3">
               <div v-for="list in lists" :key="list.id" 
                 class="group p-4 rounded-2xl border border-default transition-all cursor-pointer flex items-center gap-4"
                 :class="formData.listId === list.id ? 'bg-primary/10 border-primary/30 shadow-md ring-1 ring-primary/20' : 'bg-white dark:bg-neutral-900 hover:border-primary/40'"
                 @click="formData.listId = list.id"
               >
                  <div class="size-10 rounded-xl flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 group-hover:bg-primary/10 transition-colors" :class="formData.listId === list.id ? 'text-primary' : 'text-dimmed'">
                     <UIcon :name="list.icon" class="size-5" />
                  </div>
                  <div class="flex-1">
                     <p class="text-xs font-black uppercase tracking-tight">{{ list.label }}</p>
                     <p class="text-[10px] text-dimmed font-bold">{{ list.count.toLocaleString() }} contacts actifs</p>
                  </div>
                  <div v-if="formData.listId === list.id" class="size-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50">
                     <UIcon name="i-lucide:check" class="size-3 text-white" />
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- FOOTER NOTE -->
      <div class="text-center opacity-30">
         <p class="text-[10px] font-black uppercase tracking-[0.2em]">Flux d'envoi Techknè Quantum v4.0.1</p>
      </div>

    </div>
  </div>
</template>

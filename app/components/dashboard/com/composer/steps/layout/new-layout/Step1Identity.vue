<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const categories = [
  { id: 'contact',     label: 'Contact (Client)',   icon: 'i-lucide:users',    color: 'text-primary' },
  { id: 'newsletter',  label: 'Newsletter',         icon: 'i-lucide:megaphone', color: 'text-success' },
  { id: 'system',      label: 'Système (Auto)',     icon: 'i-lucide:cpu',       color: 'text-warning' },
  { id: 'content_layout', label: 'Content Architecture', icon: 'i-lucide:box',  color: 'text-error' },
]
</script>

<template>
  <div class="h-full flex flex-col p-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto scrollbar-thin">
    <div class="max-w-3xl mx-auto w-full space-y-12">
      
      <!-- HEADER -->
      <div class="space-y-2 text-center">
         <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-4">
            <UIcon name="i-lucide:palette" class="size-4 text-primary" />
            <span class="text-[10px] font-black uppercase tracking-widest text-primary">Création de Blueprint</span>
         </div>
         <h2 class="text-4xl font-black uppercase italic tracking-tighter">Identité du Design</h2>
         <p class="text-dimmed text-sm uppercase tracking-widest font-bold">Définissez le rôle et la classification de votre nouveau layout</p>
      </div>

      <!-- FORM -->
      <div class="grid gap-8 p-10 bg-white dark:bg-neutral-900 rounded-[3rem] border border-default shadow-2xl relative overflow-hidden">
         <!-- Design accents -->
         <div class="absolute -top-20 -right-20 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

         <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div class="space-y-6">
               <UFormField label="Nom du Design" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
                  <UInput v-model="formData.name" placeholder="ex: Newsletter Premium v1" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-3 ring-1 ring-default shadow-sm focus-within:ring-primary font-bold" />
               </UFormField>

               <UFormField label="Description" :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
                  <UTextarea v-model="formData.description" placeholder="À quoi sert ce design ?" variant="none" class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-3 ring-1 ring-default shadow-sm focus-within:ring-primary min-h-[120px]" />
               </UFormField>
            </div>

            <div class="space-y-6">
               <UFormField label="Catégorie de Layout" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
                  <div class="grid grid-cols-1 gap-2">
                     <div v-for="cat in categories" :key="cat.id" 
                       class="flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all border border-default hover:border-primary/40"
                       :class="formData.category === cat.id ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-neutral-50/50 dark:bg-neutral-900/50'"
                       @click="formData.category = cat.id"
                     >
                        <div class="size-8 rounded-xl flex items-center justify-center bg-white dark:bg-black shadow-sm" :class="cat.color">
                           <UIcon :name="cat.icon" class="size-4" />
                        </div>
                        <div class="flex-1">
                           <p class="text-[11px] font-black uppercase tracking-tight">{{ cat.label }}</p>
                           <p class="text-[9px] text-dimmed italic">Utilisation : {{ cat.id }}</p>
                        </div>
                        <div v-if="formData.category === cat.id" class="size-4 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 animate-in zoom-in-50">
                           <UIcon name="i-lucide:check" class="size-2 text-white" />
                        </div>
                     </div>
                  </div>
               </UFormField>
            </div>
         </div>
      </div>

      <!-- GUIDANCE CARD -->
      <div class="p-6 bg-warning/5 rounded-3xl border border-warning/20 flex items-start gap-4">
         <UIcon name="i-lucide:lightbulb" class="size-5 text-warning mt-1 shrink-0" />
         <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Guide de Conception</p>
            <p class="text-xs text-warning/80 leading-relaxed font-medium">
               Choisissez <strong>Layout Template</strong> pour créer la structure globale (Header/Footer). 
               Choisissez <strong>Content Architecture</strong> pour créer des blocs réutilisables à l'intérieur de ces derniers.
            </p>
         </div>
      </div>
    </div>
  </div>
</template>

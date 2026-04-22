<script setup lang="ts">
const props = defineProps<{
  modelValue: any,
  layouts: any[],
  title?: string,
  description?: string,
  icon?: string,
  colorClass?: string
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const shellLayouts = computed(() => props.layouts?.filter(l => l.category !== 'content_layout') || [])
const contentArchitectures = computed(() => props.layouts?.filter(l => l.category === 'content_layout') || [])

const selectShell = (id: string) => formData.value.layoutId = id
const selectArch = (id: string) => formData.value.contentLayoutId = id
</script>

<template>
  <div class="h-full flex flex-col p-8 sm:p-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto scrollbar-thin">
    <div class="max-w-6xl mx-auto w-full space-y-12 pb-20">
      
      <!-- HEADER -->
      <div class="space-y-2 text-center">
         <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-4" :class="colorClass || 'bg-primary/10 border-primary/20'">
            <UIcon :name="icon || 'i-lucide:layers'" class="size-4" :class="colorClass ? '' : 'text-primary'" />
            <span class="text-[10px] font-black uppercase tracking-widest" :class="colorClass ? '' : 'text-primary'">{{ title || 'Configuration' }}</span>
         </div>
         <h2 class="text-4xl font-black uppercase italic tracking-tighter">{{ title || 'Structure du Message' }}</h2>
         <p class="text-dimmed text-sm uppercase tracking-widest font-bold">{{ description || 'Sélectionnez l\'arrangement et le style de votre diffusion' }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
         
         <!-- 1. SHELL SELECTION -->
         <div class="space-y-6">
            <div class="flex items-center justify-between px-4">
               <h3 class="text-xs font-black uppercase tracking-widest text-dimmed">Enveloppe Globale (Shell)</h3>
               <span class="text-[9px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md font-bold uppercase tracking-tighter">Obligatoire</span>
            </div>
            
            <div class="grid grid-cols-1 gap-3">
               <div v-for="l in shellLayouts" :key="l.id" 
                 class="group p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-default transition-all cursor-pointer relative overflow-hidden"
                 :class="formData.layoutId === l.id ? 'border-primary ring-1 ring-primary/20 shadow-xl' : 'hover:border-primary/40'"
                 @click="selectShell(l.id)"
               >
                  <div class="flex items-center gap-4 relative z-10">
                     <div class="size-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <UIcon name="i-lucide:layout" class="size-5 text-primary" />
                     </div>
                     <div class="flex-1">
                        <p class="text-[11px] font-black uppercase tracking-tight">{{ l.name }}</p>
                        <p class="text-[9px] text-dimmed italic truncate max-w-[200px]">{{ l.description || 'Design standard Techknè' }}</p>
                     </div>
                     <UIcon v-if="formData.layoutId === l.id" name="i-lucide:check-circle-2" class="size-5 text-primary animate-in zoom-in-50" />
                  </div>
               </div>
            </div>
         </div>

         <!-- 2. ARCHITECTURE SELECTION -->
         <div class="space-y-6">
            <div class="flex items-center justify-between px-4">
               <h3 class="text-xs font-black uppercase tracking-widest text-dimmed">Architecture de Contenu</h3>
               <span class="text-[9px] px-2 py-0.5 bg-warning/10 text-warning rounded-md font-bold uppercase tracking-tighter">Optionnel</span>
            </div>
            
            <div class="grid grid-cols-1 gap-3">
               <div v-for="l in contentArchitectures" :key="l.id" 
                 class="group p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-default transition-all cursor-pointer relative overflow-hidden"
                 :class="formData.contentLayoutId === l.id ? 'border-warning ring-1 ring-warning/20 shadow-xl' : 'hover:border-warning/40'"
                 @click="selectArch(l.id)"
               >
                  <div class="flex items-center gap-4 relative z-10">
                     <div class="size-10 rounded-xl bg-warning/5 flex items-center justify-center border border-warning/10 group-hover:bg-warning/10 transition-colors">
                        <UIcon name="i-lucide:box" class="size-5 text-warning" />
                     </div>
                     <div class="flex-1">
                        <p class="text-[11px] font-black uppercase tracking-tight">{{ l.name }}</p>
                        <p class="text-[9px] text-dimmed italic truncate max-w-[200px]">{{ l.category }}</p>
                     </div>
                     <UIcon v-if="formData.contentLayoutId === l.id" name="i-lucide:check-circle-2" class="size-5 text-warning animate-in zoom-in-50" />
                  </div>
               </div>
               
               <!-- Special Choice: No Architecture -->
               <div 
                 class="p-5 rounded-3xl border border-dashed border-default transition-all cursor-pointer flex items-center gap-4 text-dimmed hover:text-neutral-500 hover:border-neutral-400"
                 @click="formData.contentLayoutId = null"
               >
                   <div class="size-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                      <UIcon name="i-lucide:slash" class="size-5" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-widest">Message Direct (Sans Blocs)</span>
                   <UIcon v-if="!formData.contentLayoutId" name="i-lucide:check-circle-2" class="size-5 ml-auto opacity-40" />
               </div>
            </div>
         </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: any,
  layouts: any[]
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref(0)
const sideNav = [
  { id: 0, label: 'Design System', icon: 'i-lucide:layout-template', description: 'Choix des briques' },
  { id: 1, label: 'Aperçu Combiné', icon: 'i-lucide:eye', description: 'Rendu Shell + Architecture' }
]

const previewZoom = ref(85)
</script>

<template>
  <div class="h-full flex overflow-hidden animate-in fade-in duration-500">
    
    <!-- SIDEBAR STUDIO -->
    <div class="w-80 border-r border-default bg-neutral-50/30 dark:bg-neutral-900/40 flex flex-col shrink-0">
       <div class="p-8 space-y-10">
          <div class="space-y-1">
             <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-dimmed opacity-50">Builder Studio</h3>
             <p class="text-2xl font-black italic uppercase tracking-tighter">Design Workspace</p>
          </div>

          <nav class="space-y-3">
             <button 
               v-for="item in sideNav" 
               :key="item.id"
               @click="activeTab = item.id"
               class="w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all duration-300 text-left group border-2"
               :class="activeTab === item.id ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-transparent text-dimmed border-transparent hover:bg-primary/5 hover:text-primary'"
             >
                <div class="size-11 rounded-2xl flex items-center justify-center transition-colors shadow-sm" :class="activeTab === item.id ? 'bg-white/20' : 'bg-neutral-100 dark:bg-neutral-800 group-hover:bg-primary/10'">
                   <UIcon :name="item.icon" class="size-6" />
                </div>
                <div>
                   <p class="text-xs font-black uppercase italic tracking-tight leading-none">{{ item.label }}</p>
                   <p class="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-widest">{{ item.description }}</p>
                </div>
             </button>
          </nav>

          <div class="pt-8 border-t border-default space-y-6">
             <div class="p-5 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 border border-default opacity-60">
                <p class="text-[9px] font-black uppercase tracking-widest text-dimmed mb-2">Conseil de l'Atelier</p>
                <p class="text-[10px] leading-relaxed font-medium italic">"Combinez un Shell sombre avec une Architecture épurée pour un impact maximal."</p>
             </div>
          </div>
       </div>
    </div>

    <!-- WORKSPACE -->
    <div class="flex-1 min-w-0 bg-white dark:bg-neutral-900 overflow-hidden relative">
      <template v-if="activeTab === 0">
         <DashboardComSharedForgeStructureSelector 
            v-model="formData" 
            :layouts="layouts"
            title="Design Builder"
            description="Le moteur de combinaison de Techknè."
         />
      </template>

      <template v-else-if="activeTab === 1">
         <div class="h-full p-12 overflow-hidden bg-neutral-100/50 dark:bg-black/20 flex flex-col">
            <DashboardComSharedMasterPreview 
               :layouts="layouts"
               :shell-id="formData.layoutId"
               :content-layout-id="formData.contentLayoutId"
               class="flex-1 rounded-[3rem] shadow-2xl border-4 border-white dark:border-neutral-800 overflow-hidden"
            />
         </div>
      </template>
    </div>

  </div>
</template>

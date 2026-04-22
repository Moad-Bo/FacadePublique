<script setup lang="ts">
import { computed, watch } from 'vue'

const props = defineProps<{
  modelValue: any,
  layouts: any[]
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// --- DYNAMIC SECTION MAPPING ---
const detectedTags = computed<string[]>(() => {
  const architecture = props.layouts?.find(l => String(l.id) === String(formData.value.contentLayoutId))
  if (!architecture) return ['content'] // Fallback to single zone

  // Find all {{tag}} patterns
  const matches = (architecture.html as string).match(/{{[^{}]+}}/g) || []
  const tags = matches.map((t: string) => t.replace(/{{|}}/g, '').trim())
  
  // Return unique tags, default to 'content' if nothing found but not 'Simple'
  return tags.length > 0 ? [...new Set(tags)] : ['content']
})

// Initialize sections object if it doesn't exist
watch(detectedTags, (tags) => {
  if (!formData.value.sections) formData.value.sections = {}
  tags.forEach(tag => {
    if (tag && formData.value.sections[tag] === undefined) {
      formData.value.sections[tag] = ''
    }
  })
}, { immediate: true })
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
     <!-- Forge Toolbar/Status -->
     <div class="flex items-center justify-between mb-4 px-6 py-2 bg-warning/5 border border-warning/10 rounded-2xl">
        <div class="flex items-center gap-3">
           <div class="size-6 rounded-lg bg-warning/20 flex items-center justify-center">
              <UIcon name="i-lucide:hammer" class="size-3.5 text-warning" />
           </div>
           <h4 class="text-[10px] font-black uppercase tracking-widest text-warning/80">
             Studio de Forge : {{ detectedTags.length }} zone(s) active(s)
           </h4>
        </div>
        <UTooltip text="Chaque zone correspond à un emplacement dans votre architecture de design." :popper="{ placement: 'left' }">
           <UIcon name="i-lucide:help-circle" class="size-3.5 text-warning/40 cursor-help" />
        </UTooltip>
     </div>

      <!-- Dynamic Editors List Stacked Vertically -->
      <div class="flex-1 overflow-y-auto pr-4 scrollbar-thin">
         <div class="flex flex-col gap-10 pb-20">
           <div v-for="tag in (detectedTags as string[])" :key="tag" class="w-full flex flex-col">
              <DashboardComSharedRichEditor 
                v-model="formData.sections[tag]" 
                :label="'ÉDITION ZONE : ' + tag.replace('_', ' ').toUpperCase()"
                :placeholder="'Rédigez le contenu pour ' + tag.replace('_', ' ') + '...'"
              />
           </div>
         </div>
      </div>
  </div>
</template>

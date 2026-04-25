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

// --- ALIAS & DOMAIN LOGIC ---
const { aliases, fetchSettings } = useCampaigns()
onMounted(() => {
  if (aliases.value.length === 0) fetchSettings()
})

const currentAlias = computed(() => {
  return aliases.value.find(a => a.email === formData.value.fromContext) || aliases.value[0] || { label: 'Support', email: 'contact@techkne.com', domain: 'techkne.com' }
})

// --- SECTIONS INITIALIZATION ---
watch(detectedTags, (tags) => {
  if (!formData.value.sections) formData.value.sections = {}
  tags.forEach(tag => {
    if (tag && formData.value.sections[tag] === undefined) {
      formData.value.sections[tag] = ''
    }
  })
}, { immediate: true })

const activeTag = ref<string>('')
const zoneRefs = ref<Record<string, HTMLElement>>({})

const scrollToZone = (tag: string) => {
  activeTag.value = tag
  const el = document.getElementById(`zone-${tag}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="flex-1 flex items-start overflow-y-auto min-h-0 bg-neutral-100/30 dark:bg-black/10 rounded-[2.5rem] border border-default p-2 scroll-smooth scrollbar-thin">
      
      <!-- 1. ZONES SIDEBAR (The "Map") - Now Sticky -->
      <aside class="w-72 hidden lg:flex flex-col gap-6 p-6 h-fit sticky top-2 shrink-0 z-20">
          <div class="bg-white dark:bg-neutral-900 rounded-[2rem] shadow-xl border border-default p-6 flex flex-col gap-6">
            <div class="space-y-1 px-2">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-dimmed opacity-40">Architecture Active</h4>
              <p class="text-xs font-black uppercase italic">{{ detectedTags.length }} Zone(s) d'édition</p>
            </div>

            <nav class="flex flex-col gap-2">
              <button 
                v-for="tag in (detectedTags as string[])" 
                :key="tag"
                type="button"
                @click.stop="scrollToZone(tag)"
                class="w-full text-left p-4 rounded-2xl transition-all duration-300 border-2 group"
                :class="activeTag === tag ? 'bg-primary/10 border-primary text-primary' : 'bg-neutral-50 dark:bg-neutral-800/50 border-transparent text-dimmed hover:border-neutral-300 dark:hover:border-neutral-700'"
              >
                <div class="flex items-center gap-3">
                   <div class="size-6 rounded-lg flex items-center justify-center font-black text-[10px]" :class="activeTag === tag ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700'">
                      {{ (detectedTags as string[]).indexOf(tag) + 1 }}
                   </div>
                   <span class="text-xs font-bold uppercase truncate">{{ tag.replace('_', ' ') }}</span>
                </div>
              </button>
            </nav>

            <div class="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
               <UIcon name="i-lucide:sparkles" class="size-4 text-primary shrink-0" />
               <p class="text-[9px] font-medium leading-relaxed italic text-primary/80">
                 Forge synchronisée.
               </p>
            </div>
          </div>
      </aside>

      <!-- 2. CENTRAL EDITING WORKSPACE -->
      <div class="flex-1 flex flex-col min-w-0">
          <!-- Status Bar (Sticky too) -->
          <div class="sticky top-0 z-30 p-4 px-8 border-b border-default bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-t-[2.5rem] flex items-center justify-between shadow-sm">
             <div class="flex items-center gap-6">
                <div class="flex items-center gap-2">
                   <div class="size-2 rounded-full bg-success animate-pulse" />
                   <span class="text-[10px] font-black uppercase tracking-widest text-dimmed">Serveur Actif</span>
                </div>
                <div class="h-4 w-px bg-default" />
                <div class="flex items-center gap-2">
                   <span class="text-[10px] font-black uppercase tracking-widest text-primary">{{ currentAlias.label }}</span>
                   <UBadge size="xs" variant="soft" color="success" class="text-[8px] font-black px-1">{{ currentAlias.domain }}</UBadge>
                </div>
             </div>
             
             <button type="button" class="lg:hidden p-2 rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide:layers" class="size-4" />
             </button>
          </div>

          <!-- Dynamic Editors Stack (No internal scroll) -->
          <div class="p-6 md:p-10 space-y-12 pr-4 md:pr-8">
             <div 
               v-for="tag in (detectedTags as string[])" 
               :key="tag" 
               :id="'zone-' + tag"
               class="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
               @mouseenter="activeTag = tag"
             >
                <div class="flex items-center gap-3 px-2">
                   <div class="px-3 py-1 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-lg text-[9px] font-black uppercase italic tracking-tighter">
                     ZONE : {{ tag.replace('_', ' ') }}
                   </div>
                   <div class="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                </div>

                <DashboardComSharedRichEditor 
                  v-model="formData.sections[tag]" 
                  :placeholder="'Rédigez le contenu pour ' + tag.replace('_', ' ') + '...'"
                  class="shadow-2xl shadow-black/5"
                />
             </div>
             
             <!-- Spacer for bottom padding -->
             <div class="h-32" />
          </div>
      </div>
  </div>
</template>

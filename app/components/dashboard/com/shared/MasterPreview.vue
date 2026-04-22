<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  shellId?: string
  architectureId?: string
  contentLayoutId?: string
  shellHtml?: string
  architectureHtml?: string
  sections?: Record<string, string>
  content?: string
  layouts?: any[]
  title?: string
  showControls?: boolean
}>()

const { assemble } = useMailAssembler()

// --- STATE ---
const zoom = ref(100)
const viewportWidth = ref('100%')
const activeDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
const iframeRef = ref<HTMLIFrameElement | null>(null)
const isExtruded = ref(false)

// --- ASSEMBLED CONTENT ---
const assembledHtml = computed(() => {
  const data = props.sections || { content: props.content || '' }
  // Support both naming conventions for the same thing
  const effectiveArchId = props.architectureId || props.contentLayoutId
  
  return assemble(
    props.layouts, 
    props.shellId, 
    effectiveArchId, 
    data, 
    props.shellHtml, 
    props.architectureHtml
  )
})

const updateIframe = () => {
  if (!iframeRef.value) return
  const doc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; font-family: sans-serif; background: #ffffff; color: #171717; }
          .render-root { min-height: 100vh; overflow-x: hidden; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="render-root animate-in fade-in duration-500">${assembledHtml.value}</div>
      </body>
    </html>
  `
  iframeRef.value.srcdoc = doc
}

watch(assembledHtml, updateIframe)
onMounted(() => setTimeout(updateIframe, 100))

const setDevice = (device: 'desktop' | 'tablet' | 'mobile') => {
  activeDevice.value = device
  viewportWidth.value = device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '375px'
}
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-neutral-900 border border-default overflow-hidden relative group transition-all duration-500 shadow-sm">
    
    <!-- HEADER BAR: RE-DESIGNED -->
    <div class="px-5 py-2.5 border-b border-default bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center justify-between shrink-0 z-10">
      <div class="flex items-center gap-3">
        <div class="size-2 rounded-full bg-success animate-pulse" />
        <span class="text-[9px] font-black uppercase text-dimmed tracking-widest">{{ title || 'Master Preview' }}</span>
      </div>

      <!-- DEVICE SELECTOR -->
      <div class="flex items-center gap-1 p-1 bg-white dark:bg-neutral-950 rounded-xl border border-default">
          <UButton 
            v-for="d in (['desktop', 'tablet', 'mobile'] as const)" :key="d"
            :icon="d === 'desktop' ? 'i-lucide:monitor' : d === 'tablet' ? 'i-lucide:tablet' : 'i-lucide:smartphone'"
            variant="ghost" color="neutral" size="xs" 
            class="rounded-lg transition-all"
            :class="activeDevice === d ? 'bg-primary/10 text-primary shadow-sm' : 'opacity-40'"
            @click="setDevice(d)"
          />
      </div>
    </div>

    <!-- MAIN VIEWPORT (Occupies 100%) -->
    <div class="flex-1 relative bg-neutral-100 dark:bg-neutral-950/20 overflow-hidden flex flex-col items-center justify-start py-8">
       <div 
         class="relative transition-all duration-700 shadow-2xl bg-white border border-default origin-top"
         :style="{ width: viewportWidth, transform: `scale(${zoom / 100})`, minHeight: '100%' }"
       >
          <iframe ref="iframeRef" class="w-full h-full min-h-[500px] border-none" sandbox="allow-popups allow-scripts"></iframe>
       </div>

       <!-- FLOATING ACTION: ENLARGE (Bottom Left) -->
       <div class="absolute bottom-6 left-6 z-20">
          <UButton 
            icon="i-lucide:maximize" 
            label="Agrandir" 
            size="md" 
            color="neutral" 
            variant="solid"
            class="rounded-full shadow-2xl font-black italic uppercase tracking-tighter hover:scale-110 active:scale-95 transition-all border-default ring-4 ring-black/5"
            @click="isExtruded = true"
          />
       </div>

       <!-- ZOOM CONTROL (Right) -->
       <div class="absolute bottom-6 right-6 z-20 flex flex-col gap-2 p-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur rounded-full border border-default shadow-xl">
          <UButton icon="i-lucide:plus" variant="ghost" color="neutral" size="xs" @click="zoom += 10" />
          <div class="text-[9px] font-black text-center py-1 opacity-40">{{ zoom }}%</div>
          <UButton icon="i-lucide:minus" variant="ghost" color="neutral" size="xs" @click="zoom -= 10" />
       </div>
    </div>

    <!-- EXTRUDED VIEW (Teleport) -->
    <Teleport to="body">
       <Transition 
         enter-active-class="transform transition duration-500 ease-out" 
         enter-from-class="opacity-0 scale-95" 
         enter-to-class="opacity-100 scale-100" 
         leave-active-class="transform transition duration-300 ease-in" 
         leave-from-class="opacity-100 scale-100" 
         leave-to-class="opacity-0 scale-95"
       >
          <div v-if="isExtruded" class="fixed inset-0 z-[100] p-[5vw] flex items-center justify-center">
             <!-- Blurred Background -->
             <div class="absolute inset-0 bg-neutral-950/60 backdrop-blur-3xl" @click="isExtruded = false" />
             
             <!-- Close Button (Top Left of the Blur zone) -->
             <div class="absolute top-8 left-8 z-[110]">
                <UButton 
                  icon="i-lucide:x" 
                  size="xl" 
                  color="neutral" 
                  variant="solid" 
                  class="rounded-full size-12 flex items-center justify-center shadow-2xl hover:rotate-90 transition-all duration-300" 
                  @click="isExtruded = false" 
                />
             </div>

             <!-- Extruded Preview Content -->
             <div 
               class="relative z-[105] w-full h-full bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500"
               :class="activeDevice === 'mobile' ? 'max-w-[375px]' : activeDevice === 'tablet' ? 'max-w-[768px]' : 'max-w-none'"
             >
                <div class="h-10 bg-neutral-50 dark:bg-neutral-900 border-b border-default flex items-center px-4 justify-between">
                   <div class="flex gap-2">
                       <div class="size-2.5 rounded-full bg-red-400" />
                       <div class="size-2.5 rounded-full bg-amber-400" />
                       <div class="size-2.5 rounded-full bg-green-400" />
                   </div>
                   <span class="text-[10px] font-black opacity-40 uppercase tracking-widest italic">Aperçu Haute Définition</span>
                   <div class="w-10" />
                </div>
                <iframe ref="iframeRef" class="w-full h-[calc(100%-40px)] border-none" :srcdoc="iframeRef?.srcdoc"></iframe>
             </div>
          </div>
       </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
iframe {
  image-rendering: auto;
}
</style>

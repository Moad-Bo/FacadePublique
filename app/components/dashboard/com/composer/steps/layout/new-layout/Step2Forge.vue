<script setup lang="ts">
const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const insertTag = (tag: string) => {
  const textarea = document.getElementById('blueprint-editor') as HTMLTextAreaElement
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const content = formData.value.body || ''
  
  formData.value.body = content.substring(0, start) + `{{${tag}}}` + content.substring(end)
  
  // Refocus
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + tag.length + 4, start + tag.length + 4)
  })
}

const standardTags = [
  { id: 'content', label: 'Contenu Principal', icon: 'i-lucide:file-text', desc: 'Indispensable pour les Shells' },
  { id: 'user_name', label: 'Nom Utilisateur', icon: 'i-lucide:user', desc: 'Variable de contact' },
  { id: 'current_year', label: 'Année Actuelle', icon: 'i-lucide:calendar', desc: 'Pour le footer' },
]

const architectureTags = [
  { id: 'left_column', label: 'Colonne Gauche', icon: 'i-lucide:columns-2' },
  { id: 'right_column', label: 'Colonne Droite', icon: 'i-lucide:columns-2' },
  { id: 'card_title', label: 'Titre de Carte', icon: 'i-lucide:heading' },
  { id: 'hero_image', label: 'Image Hero', icon: 'i-lucide:image' },
]
</script>

<template>
  <div class="h-full flex overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
    
    <!-- LEFT: EDITOR & TOOLS -->
    <div class="w-1/2 border-r border-default flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
       
       <!-- TOOLBAR -->
       <div class="p-4 border-b border-default bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div class="flex items-center gap-3">
             <div class="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide:code" class="size-4 text-primary" />
             </div>
             <h3 class="font-black text-xs uppercase tracking-widest">Éditeur de Blueprint</h3>
          </div>
          <div class="flex items-center gap-2">
             <UTooltip text="Le contenu entouré de {{ }} sera détecté comme une zone éditable dans La Forge.">
                <UIcon name="i-lucide:info" class="size-3.5 text-dimmed cursor-help" />
             </UTooltip>
          </div>
       </div>

       <!-- EDITOR AREA -->
       <div class="flex-1 flex flex-col overflow-hidden relative group">
          <textarea 
            id="blueprint-editor"
            v-model="formData.body"
            placeholder="Structurez votre HTML ici. Utilisez {{content}} ou {{votre_tag}}..."
            class="flex-1 p-8 font-mono text-sm leading-relaxed bg-transparent focus:outline-none resize-none scrollbar-thin selection:bg-primary/20"
          ></textarea>
          
          <!-- INSERTION TOOLBOX (Floating) -->
          <div class="absolute bottom-6 left-6 right-6 flex flex-col gap-4">
             <div class="p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-default rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
                <p class="text-[9px] font-black uppercase tracking-widest text-dimmed mb-3 opacity-60">Insérer des zones dynamiques</p>
                <div class="flex flex-wrap gap-2">
                   <UButton 
                     v-for="tag in standardTags" 
                     :key="tag.id" 
                     :label="tag.label" 
                     :icon="tag.icon"
                     size="xs" 
                     variant="soft" 
                     color="neutral" 
                     class="rounded-lg text-[10px] uppercase font-bold px-3 py-1.5"
                     @click="insertTag(tag.id)" 
                   />
                </div>
                
                <div v-if="formData.category === 'content_layout'" class="mt-3 pt-3 border-t border-default/10">
                   <p class="text-[9px] font-black uppercase tracking-widest text-warning mb-3 opacity-60">Spécifique Architecture</p>
                   <div class="flex flex-wrap gap-2">
                      <UButton 
                        v-for="tag in architectureTags" 
                        :key="tag.id" 
                        :label="tag.label" 
                        :icon="tag.icon"
                        size="xs" 
                        variant="soft" 
                        color="warning" 
                        class="rounded-lg text-[10px] uppercase font-bold px-3 py-1.5"
                        @click="insertTag(tag.id)" 
                      />
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- RIGHT: LIVE PREVIEW -->
    <div class="w-1/2 bg-neutral-100 dark:bg-neutral-950/20 p-8 flex flex-col">
       <div class="flex items-center gap-3 mb-6">
          <div class="size-8 rounded-xl bg-success/10 flex items-center justify-center">
             <UIcon name="i-lucide:eye" class="size-4 text-success" />
          </div>
          <h3 class="font-black text-xs uppercase tracking-widest">Rendu en Temps Réel</h3>
       </div>

       <div class="flex-1 bg-white dark:bg-neutral-900 rounded-[3rem] border border-default shadow-2xl overflow-hidden relative">
          <!-- Dynamic Assembler Simulation -->
          <DashboardComSharedMasterPreview 
            v-if="formData.category !== 'content_layout'"
            :content="'<div style=\'text-align:center; padding: 40px;\'><h1>Aperçu de votre Structure</h1><p>Ceci est l\'emplacement de {{content}}</p></div>'" 
            :shell-html="formData.body"
            class="h-full w-full"
          />
          <DashboardComSharedMasterPreview 
            v-else
            :architecture-id="formData.id || 'preview'"
            :architecture-html="formData.body"
            :content="'Rendu de l\'architecture en isolation'"
            class="h-full w-full"
          />
       </div>

       <div class="mt-6 flex items-center gap-4 px-6 py-4 bg-primary/5 rounded-3xl border border-primary/20 animate-in fade-in duration-1000">
          <UIcon name="i-lucide:sparkles" class="size-5 text-primary" />
          <p class="text-xs font-medium text-primary/80 italic leading-tight">
             L'aperçu utilise le moteur de rendu <strong>Techknè Master</strong>. 
             Les zones <code>{{ '{{tags}}' }}</code> deviennent automatiquement éditables dans La Forge du compositeur.
          </p>
       </div>
    </div>

  </div>
</template>

<style scoped>
#blueprint-editor {
  tab-size: 2;
  transition: all 0.3s ease;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: ['permission'],
  requiredPermission: ['manage_mail', 'manage_newsletter'],
  title: 'Communication'
})

const notify = useNotify()

// ─── STATE ──────────────────────────────────────────────────────────────────
const layouts = ref<any[]>([])
const selectedLayout = ref<any>(null)

// Automation / System Templates
const systemTemplates = ref<any[]>([])
const selectedTemplate = ref<any>(null)

const loading = ref(true)
const fetchError = ref<string | null>(null)

// Focus mode
const activeSelectionType = ref<'layout' | 'automation'>('layout')

const { openComposer } = useComposer()

// ─── CATEGORIES & GROUPING ──────────────────────────────────────────────────
const categories = [
  { id: 'contact',     label: 'Contact',      icon: 'i-lucide:inbox',      group: 'communication' },
  { id: 'newsletter',  label: 'Newsletter',   icon: 'i-lucide:megaphone',  group: 'communication' },
  { id: 'forum',       label: 'Forum',        icon: 'i-lucide:message-square', group: 'community' },
  { id: 'blog',        label: 'Blog',         icon: 'i-lucide:book-open',  group: 'community' },
  { id: 'system',      label: 'Système',      icon: 'i-lucide:cpu',        group: 'system' },
  { id: 'notification',label: 'Notifications',icon: 'i-lucide:bell-ring',  group: 'system' },
  { id: 'content_layout', label: 'Content Architecture', icon: 'i-lucide:box', group: 'content' },
]

const sidebarAccordionItems = computed(() => {
  return [
    {
      label: 'Layout Templates',
      icon: 'i-lucide:layout-template',
      defaultOpen: true,
      slot: 'templates'
    },
    {
      label: 'Content Architecture',
      icon: 'i-lucide:boxes',
      defaultOpen: true,
      slot: 'content'
    }
  ]
})

const layoutsGrouped = computed(() => {
  const grouped: Record<string, any[]> = { 
    templates: [], 
    content: []
  }
  
  for (const l of layouts.value) {
    if (l.category === 'content_layout') {
      grouped.content.push(l)
    } else {
      grouped.templates.push(l)
    }
  }
  
  // Add automations to templates (nested under system category)
  systemTemplates.value.forEach(t => {
    grouped.templates.push({ ...t, isAutomation: true, category: 'system' })
  })
  
  // Further group templates by category for the accordion sub-headers
  const templatesByCategory: Record<string, any[]> = {}
  grouped.templates.forEach(t => {
    if (!templatesByCategory[t.category]) templatesByCategory[t.category] = []
    templatesByCategory[t.category].push(t)
  })

  return { 
    raw: grouped,
    templatesByCategory
  }
})

// ─── FETCHING ─────────────────────────────────────────────────────────────────
const fetchData = async () => {
  loading.value = true
  fetchError.value = null
  try {
    const [layoutsRes, systemRes] = await Promise.all([
      $fetch<any>('/api/mails/layouts'),
      $fetch<any>('/api/mails/system-templates')
    ])
    
    if (layoutsRes?.success) layouts.value = layoutsRes.layouts
    if (systemRes?.success) systemTemplates.value = systemRes.templates

    if (layouts.value.length > 0) selectLayout(layouts.value[0])
  } catch (e: any) {
    fetchError.value = e.message
    notify.error('Erreur chargement', e.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
const selectLayout = (layout: any) => {
  if (layout.isAutomation) {
     selectTemplate(layout)
     return
  }
  activeSelectionType.value = 'layout'
  selectedLayout.value = layout
  selectedTemplate.value = null
}

const selectTemplate = (tpl: any) => {
  activeSelectionType.value = 'automation'
  selectedTemplate.value = tpl
  selectedLayout.value = null
}

const openEditor = (item: any, type: 'layout' | 'automation') => {
  if (type === 'layout') {
    openComposer({
      mode: 'layout',
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      body: item.html
    })
  } else {
    openComposer({
      mode: 'automation',
      id: item.id,
      subject: item.subject,
      body: item.content,
      layoutId: item.layoutId || 'system'
    })
  }
}

const setAsDefault = async (id: string) => {
  try {
    await $fetch('/api/mails/layouts', { method: 'POST', body: { action: 'set-default', id } })
    notify.success('Layout par défaut mis à jour')
    await fetchData()
  } catch (e: any) { notify.error('Erreur', e.message) }
}

const deleteLayout = async (layout: any) => {
  if (layout.isDefault) return notify.warning('Protection', 'Impossible de supprimer le layout par défaut.')
  try {
    await $fetch('/api/mails/layouts', { method: 'POST', body: { action: 'delete', id: layout.id } })
    notify.success('Layout supprimé')
    await fetchData()
  } catch (e: any) { notify.error('Erreur', e.message) }
}

const dummyContent = `
  <h1 style="color:#6366f1;">Techknè Engine Test</h1>
  <p>Ceci est un exemple de contenu pour visualiser le rendu final.</p>
  <div style="padding:15px; background:#f3f4f6; border-radius:8px;">
    Variable test : <strong>{{user}}</strong>
  </div>
`
</script>

<template>
  <UDashboardPanel grow>
    <div class="h-full flex overflow-hidden bg-neutral-50 dark:bg-neutral-950/20">

      <!-- ── SIDEBAR ──────────────────────────────────────────────────────── -->
      <aside class="w-80 border-r border-default bg-white dark:bg-neutral-900 shrink-0 flex flex-col overflow-hidden shadow-sm">
        
        <!-- Nouveau Button at top -->
        <div class="p-4 border-b border-default bg-neutral-50/50 dark:bg-neutral-900/50">
           <UButton 
             label="Nouveau Layout" 
             icon="i-lucide:plus" 
             block 
             color="primary" 
             variant="solid" 
             size="md" 
             class="rounded-xl font-bold shadow-lg shadow-primary/20"
             @click="openComposer({ mode: 'layout', isCreation: true })" 
           />
        </div>

        <div class="flex-1 overflow-y-auto p-3 scrollbar-thin">
           <UAccordion :items="sidebarAccordionItems" :ui="{ root: 'flex flex-col gap-4' }">
              <template #templates>
                 <div class="flex flex-col gap-6 pt-2">
                    <div v-for="(items, catId) in layoutsGrouped.templatesByCategory" :key="catId" class="space-y-1">
                       <div class="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-dimmed opacity-70">
                          {{ categories.find(c => c.id === catId)?.label || catId.toUpperCase() }}
                       </div>
                       
                       <div v-for="l in items" :key="l.id" 
                         class="group/item flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all border border-transparent"
                         :class="(activeSelectionType === 'automation' ? selectedTemplate?.id === l.id : selectedLayout?.id === l.id) ? 'bg-primary/10 border-primary/20 shadow-sm' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'"
                         @click="selectLayout(l)"
                       >
                          <UIcon :name="l.isAutomation ? 'i-lucide:zap' : (categories.find(c => c.id === l.category)?.icon || 'i-lucide:layout')" class="size-3.5 shrink-0" :class="(activeSelectionType === 'automation' ? selectedTemplate?.id === l.id : selectedLayout?.id === l.id) ? 'text-primary' : 'text-dimmed'" />
                          <div class="flex-1 min-w-0">
                             <p class="text-xs font-bold truncate leading-none">{{ l.isAutomation ? l.id.split('_').join(' ').toUpperCase() : l.name }}</p>
                             <p v-if="l.isDefault" class="text-[8px] font-black text-primary uppercase mt-1">Défaut</p>
                          </div>
                          <!-- Actions -->
                          <div class="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                             <UButton icon="i-lucide:paintbrush" size="xs" variant="soft" color="primary" class="rounded-lg scale-90" @click.stop="openEditor(l, l.isAutomation ? 'automation' : 'layout')" />
                             <UButton v-if="!l.isAutomation && !l.isDefault" icon="i-lucide:star" size="xs" variant="ghost" color="neutral" class="rounded-lg scale-90" @click.stop="setAsDefault(l.id)" />
                             <UButton v-if="!l.isAutomation && !l.isDefault" icon="i-lucide:trash-2" size="xs" variant="ghost" color="error" class="rounded-lg scale-90" @click.stop="deleteLayout(l)" />
                          </div>
                       </div>
                    </div>
                 </div>
              </template>

              <template #content>
                 <div class="flex flex-col gap-1 pt-2">
                    <div v-if="layoutsGrouped.raw.content.length === 0" class="px-4 py-2 text-[10px] text-dimmed italic opacity-50">Aucun layout d'architecture</div>
                    <div v-for="l in layoutsGrouped.raw.content" :key="l.id" 
                      class="group/item flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all border border-transparent"
                      :class="selectedLayout?.id === l.id ? 'bg-warning/10 border-warning/20 shadow-sm' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'"
                      @click="selectLayout(l)"
                    >
                       <UIcon name="i-lucide:box" class="size-3.5 shrink-0" :class="selectedLayout?.id === l.id ? 'text-warning' : 'text-dimmed'" />
                       <div class="flex-1 min-w-0">
                          <p class="text-xs font-bold truncate leading-none">{{ l.name }}</p>
                       </div>
                       <div class="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <UButton icon="i-lucide:paintbrush" size="xs" variant="soft" color="warning" class="rounded-lg scale-90" @click.stop="openEditor(l, 'layout')" />
                          <UButton v-if="!l.isDefault" icon="i-lucide:trash-2" size="xs" variant="ghost" color="error" class="rounded-lg scale-90" @click.stop="deleteLayout(l)" />
                       </div>
                    </div>
                 </div>
              </template>
           </UAccordion>
        </div>
      </aside>

      <!-- ── MAIN PREVIEW ─────────────────────────────────────────────────── -->
      <main class="flex-1 flex flex-col overflow-hidden relative">
        <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
           <UIcon name="i-lucide:refresh-cw" class="size-8 animate-spin text-primary opacity-50" />
        </div>

        <template v-if="selectedLayout || selectedTemplate">
           <div class="flex-none p-4 px-8 border-b border-default bg-white dark:bg-neutral-900 flex items-center justify-between shadow-sm">
              <div class="flex items-center gap-4">
                 <div class="size-10 rounded-2xl flex items-center justify-center border border-default shadow-sm" :class="activeSelectionType === 'layout' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'">
                    <UIcon :name="activeSelectionType === 'layout' ? 'i-lucide:palette' : 'i-lucide:cpu'" class="size-5" />
                 </div>
                 <div>
                    <h3 class="font-black text-sm uppercase tracking-tight">{{ selectedLayout?.name || (selectedTemplate?.id || '').replace(/_/g, ' ').toUpperCase() }}</h3>
                    <p class="text-[10px] text-dimmed font-medium">{{ activeSelectionType === 'layout' ? selectedLayout?.category : 'Template Système Automatisé' }}</p>
                 </div>
              </div>
              <UButton label="Éditer avec le Moteur Techknè" icon="i-lucide:paintbrush" color="primary" variant="solid" size="sm" class="rounded-xl px-4 shadow-lg shadow-primary/20" @click="activeSelectionType === 'layout' ? openEditor(selectedLayout, 'layout') : openEditor(selectedTemplate, 'automation')" />
           </div>

           <div class="flex-1 p-8 overflow-y-auto bg-neutral-100 dark:bg-neutral-950/20 scrollbar-thin">
              <div class="max-w-4xl mx-auto space-y-6">
                 <!-- Metadata Info -->
                 <div v-if="selectedLayout?.description" class="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-default shadow-sm animate-in fade-in slide-in-from-top-2">
                    <p class="text-[10px] uppercase font-black text-dimmed tracking-widest mb-1">Description</p>
                    <p class="text-xs">{{ selectedLayout.description }}</p>
                 </div>

                 <!-- Render Preview -->
                 <div class="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-default shadow-2xl overflow-hidden aspect-[16/10] relative group animate-in zoom-in-95 duration-300">
                    <DashboardComSharedMasterPreview 
                      :shell-id="activeSelectionType === 'layout' && selectedLayout?.category !== 'content_layout' ? selectedLayout?.id : undefined"
                      :architecture-id="selectedLayout?.category === 'content_layout' ? selectedLayout?.id : undefined"
                      :content="activeSelectionType === 'layout' ? dummyContent : (selectedTemplate?.content || '')" 
                      :layouts="layouts"
                      :title="selectedLayout?.name || 'Aperçu du Layout'"
                      :show-controls="true"
                      class="h-full w-full"
                    />
                 </div>
              </div>
           </div>
        </template>

        <div v-else-if="!loading && fetchError" class="flex-1 flex flex-col items-center justify-center text-center gap-4">
           <div class="size-20 rounded-full bg-error/10 flex items-center justify-center text-error mb-2">
              <UIcon name="i-lucide:alert-circle" class="size-10" />
           </div>
           <div>
              <p class="font-bold text-lg">Impossible de contacter le serveur</p>
              <p class="text-xs text-dimmed max-w-xs mx-auto mt-1">{{ fetchError }}</p>
           </div>
           <UButton label="Réessayer" icon="i-lucide:refresh-cw" variant="soft" color="primary" class="rounded-xl px-6" @click="fetchData" />
        </div>

        <div v-else-if="!loading" class="flex-1 flex flex-col items-center justify-center opacity-30 text-center gap-4">
           <UIcon name="i-lucide:layout-template" class="size-20" />
           <p class="font-bold">Sélectionnez un design ou un automate pour prévisualiser</p>
        </div>
      </main>
    </div>
  </UDashboardPanel>
</template>
